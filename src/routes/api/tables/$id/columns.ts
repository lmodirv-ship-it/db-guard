/**
 * /api/tables/$id/columns
 *  POST   — add column
 *  DELETE — via /api/columns/$colId (separate file)
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { requireAuth as requireSession } from "@/lib/auth/api-auth.server";
import { audit } from "@/lib/audit/log.server";

const AddCol = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/i),
  data_type: z.enum(["text", "number", "boolean", "date", "datetime", "json", "email", "url"]),
  is_required: z.boolean().optional(),
});

export const Route = createFileRoute("/api/tables/$id/columns")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const s = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = AddCol.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");
          // ensure table belongs to tenant
          const t = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            SELECT id FROM db_tables WHERE tenant_id = ${s.tid} AND id = ${params.id} LIMIT 1
          `);
          if (!t[0]) return jsonError(404, "not_found");
          const pos = await withTenant<{ p: number }>(s.tid, (sql) => sql`
            SELECT COALESCE(MAX(position),-1) + 1 AS p FROM db_columns WHERE table_id = ${params.id}
          `);
          const inserted = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            INSERT INTO db_columns (tenant_id, table_id, name, data_type, is_required, position)
            VALUES (${s.tid}, ${params.id}, ${parsed.data.name}, ${parsed.data.data_type},
                    ${parsed.data.is_required ?? false}, ${pos[0]?.p ?? 0})
            RETURNING id
          `);
          await audit({ action: "column.create", tenantId: s.tid, actorUserId: s.sub, target: inserted[0].id, meta: parsed.data, request });
          return jsonOk({ column: inserted[0] });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "create_failed");
        }
      },
    },
  },
});
