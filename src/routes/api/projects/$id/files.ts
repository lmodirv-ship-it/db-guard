/**
 * GET  /api/projects/$id/files          — list files for project
 * POST /api/projects/$id/files          — upload (multipart/form-data: file, kind?)
 *                                          OR raw body with ?name=&kind=&contentType=
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import {
  requireSession,
  jsonError,
  jsonOk,
  AuthError,
} from "@/lib/auth/session.server";
import { withTenant } from "@/lib/db/tenant.server";
import { buildKey, getStorage } from "@/lib/storage/storage.server";

const MAX_FILE = 25 * 1024 * 1024;

const KindSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const NameSchema = z.string().min(1).max(255).regex(/^[A-Za-z0-9._\/-]+$/);

export const Route = createFileRoute("/api/projects/$id/files")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const session = await requireSession(request);
          const projectId = params.id;
          if (!/^[0-9a-f-]{36}$/i.test(projectId)) return jsonError(400, "invalid_id");

          // Confirm project belongs to tenant
          const proj = await withTenant<{ id: string }>(session.tid, (sql) => sql`
            SELECT id FROM projects
             WHERE tenant_id = ${session.tid} AND id = ${projectId}
             LIMIT 1
          `);
          if (proj.length === 0) return jsonError(404, "not_found");

          const rows = await withTenant<{
            id: string;
            r2_key: string;
            kind: string;
            size_bytes: number | null;
            mime_type: string | null;
            created_at: string;
          }>(session.tid, (sql) => sql`
            SELECT id, r2_key, kind, size_bytes, mime_type, created_at
              FROM project_files
             WHERE tenant_id = ${session.tid} AND project_id = ${projectId}
             ORDER BY created_at DESC
             LIMIT 200
          `);
          return jsonOk({ files: rows });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("files_list_failed", err);
          return jsonError(500, "list_failed");
        }
      },

      POST: async ({ request, params }) => {
        try {
          const session = await requireSession(request);
          const projectId = params.id;
          if (!/^[0-9a-f-]{36}$/i.test(projectId)) return jsonError(400, "invalid_id");

          const proj = await withTenant<{ id: string }>(session.tid, (sql) => sql`
            SELECT id FROM projects
             WHERE tenant_id = ${session.tid} AND id = ${projectId}
             LIMIT 1
          `);
          if (proj.length === 0) return jsonError(404, "not_found");

          const ct = request.headers.get("content-type") ?? "";
          let bytes: Uint8Array;
          let name: string;
          let kind: string;
          let mime: string | null;

          if (ct.startsWith("multipart/form-data")) {
            const form = await request.formData();
            const file = form.get("file");
            if (!(file instanceof File)) return jsonError(400, "no_file");
            if (file.size > MAX_FILE) return jsonError(413, "file_too_large");
            const rawName = form.get("name");
            const rawKind = form.get("kind");
            name = NameSchema.parse(typeof rawName === "string" && rawName ? rawName : file.name);
            kind = KindSchema.parse(typeof rawKind === "string" && rawKind ? rawKind : "raw");
            mime = file.type || null;
            bytes = new Uint8Array(await file.arrayBuffer());
          } else {
            const url = new URL(request.url);
            name = NameSchema.parse(url.searchParams.get("name") ?? "");
            kind = KindSchema.parse(url.searchParams.get("kind") ?? "raw");
            mime = url.searchParams.get("contentType") ?? ct ?? null;
            const buf = await request.arrayBuffer();
            if (buf.byteLength > MAX_FILE) return jsonError(413, "file_too_large");
            bytes = new Uint8Array(buf);
          }

          const key = buildKey(session.tid, projectId, name);
          const storage = getStorage();
          const { size } = await storage.put(key, bytes, mime);

          const rows = await withTenant<{ id: string; r2_key: string }>(
            session.tid,
            (sql) => sql`
              INSERT INTO project_files (tenant_id, project_id, r2_key, kind, size_bytes, mime_type)
              VALUES (${session.tid}, ${projectId}, ${key}, ${kind}, ${size}, ${mime})
              RETURNING id, r2_key
            `,
          );
          return jsonOk({ file: { id: rows[0].id, key: rows[0].r2_key, size, kind, mime } });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          if (err instanceof z.ZodError) return jsonError(400, "invalid_input");
          console.error("file_upload_failed", err);
          return jsonError(500, "upload_failed");
        }
      },
    },
  },
});
