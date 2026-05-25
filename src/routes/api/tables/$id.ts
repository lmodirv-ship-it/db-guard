/**
 * /api/tables/$id
 *  GET    — table + columns
 *  PATCH  — rename or update description
 *  DELETE — delete (forbidden if is_system)
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { audit } from "@/lib/audit/log.server";

const PatchSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/i).optional(),
  description: z.string().max(500).nullable().optional(),
});

export const Route = createFileRoute("/api/tables/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const s = await requireSession(request);
          const tables = await withTenant<{
            id: string; name: string; description: string | null;
            is_system: boolean; created_at: string;
          }>(s.tid, (sql) => sql`
            SELECT id, name, description, is_system, created_at
            FROM db_tables WHERE tenant_id = ${s.tid} AND id = ${params.id} LIMIT 1
          `);
          if (!tables[0]) return jsonError(404, "not_found");
          const cols = await withTenant<{
            id: string; name: string; data_type: string;
            is_required: boolean; position: number;
          }>(s.tid, (sql) => sql`
            SELECT id, name, data_type, is_required, position
            FROM db_columns WHERE table_id = ${params.id} ORDER BY position ASC
          `);
          return jsonOk({ table: tables[0], columns: cols });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "get_failed");
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const s = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = PatchSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");
          const { name, description } = parsed.data;
          await withTenant(s.tid, (sql) => sql`
            UPDATE db_tables SET
              name = COALESCE(${name ?? null}, name),
              description = COALESCE(${description ?? null}, description)
            WHERE tenant_id = ${s.tid} AND id = ${params.id}
          `);
          await audit({ action: "table.update", tenantId: s.tid, actorUserId: s.sub, target: params.id, meta: parsed.data, request });
          return jsonOk({});
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "update_failed");
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const s = await requireSession(request);
          const t = await withTenant<{ is_system: boolean; name: string }>(s.tid, (sql) => sql`
            SELECT is_system, name FROM db_tables WHERE tenant_id = ${s.tid} AND id = ${params.id} LIMIT 1
          `);
          if (!t[0]) return jsonError(404, "not_found");
          if (t[0].is_system) return jsonError(403, "system_table_protected");
          await withTenant(s.tid, (sql) => sql`
            DELETE FROM db_tables WHERE tenant_id = ${s.tid} AND id = ${params.id}
          `);
          await audit({ action: "table.delete", tenantId: s.tid, actorUserId: s.sub, target: params.id, meta: { name: t[0].name }, request });
          return jsonOk({});
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "delete_failed");
        }
      },
    },
  },
});
