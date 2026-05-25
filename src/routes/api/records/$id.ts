/**
 * /api/records/$id  — PATCH / DELETE a single record
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { audit } from "@/lib/audit/log.server";

const PatchSchema = z.object({ data: z.record(z.string(), z.unknown()) });

export const Route = createFileRoute("/api/records/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const s = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = PatchSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");
          const dataStr = JSON.stringify(parsed.data.data);
          const updated = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            UPDATE db_records SET data = ${dataStr}::jsonb
            WHERE tenant_id = ${s.tid} AND id = ${params.id}
            RETURNING id
          `);
          if (!updated[0]) return jsonError(404, "not_found");
          await audit({ action: "record.update", tenantId: s.tid, actorUserId: s.sub, target: params.id, request });
          return jsonOk({});
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "update_failed");
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const s = await requireSession(request);
          const deleted = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            DELETE FROM db_records WHERE tenant_id = ${s.tid} AND id = ${params.id}
            RETURNING id
          `);
          if (!deleted[0]) return jsonError(404, "not_found");
          await audit({ action: "record.delete", tenantId: s.tid, actorUserId: s.sub, target: params.id, request });
          return jsonOk({});
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "delete_failed");
        }
      },
    },
  },
});
