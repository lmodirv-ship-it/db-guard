/**
 * GET /api/files/$fileId — download a stored file (tenant-checked).
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  requireSession,
  jsonError,
  AuthError,
} from "@/lib/auth/session.server";
import { withTenant } from "@/lib/db/tenant.server";
import { assertKeyForTenant, getStorage } from "@/lib/storage/storage.server";

export const Route = createFileRoute("/api/files/$fileId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const session = await requireSession(request);
          const fileId = params.fileId;
          if (!/^[0-9a-f-]{36}$/i.test(fileId)) return jsonError(400, "invalid_id");

          const rows = await withTenant<{
            r2_key: string;
            mime_type: string | null;
          }>(session.tid, (sql) => sql`
            SELECT r2_key, mime_type FROM project_files
             WHERE tenant_id = ${session.tid} AND id = ${fileId}
             LIMIT 1
          `);
          if (rows.length === 0) return jsonError(404, "not_found");

          const key = rows[0].r2_key;
          assertKeyForTenant(key, session.tid);

          const obj = await getStorage().get(key);
          if (!obj) return jsonError(404, "object_missing");

          return new Response(obj.bytes, {
            status: 200,
            headers: {
              "Content-Type": obj.contentType ?? rows[0].mime_type ?? "application/octet-stream",
              "Content-Length": String(obj.size),
              "Cache-Control": "private, max-age=0, must-revalidate",
            },
          });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("file_get_failed", err);
          return jsonError(500, "get_failed");
        }
      },
    },
  },
});
