/**
 * /api/api-keys/$id  — DELETE = revoke
 */
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { audit } from "@/lib/audit/log.server";

export const Route = createFileRoute("/api/api-keys/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          const s = await requireSession(request);
          const r = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            UPDATE api_keys SET revoked_at = now()
            WHERE tenant_id = ${s.tid} AND id = ${params.id} AND revoked_at IS NULL
            RETURNING id
          `);
          if (!r[0]) return jsonError(404, "not_found");
          await audit({ action: "api_key.revoke", tenantId: s.tid, actorUserId: s.sub, target: params.id, request });
          return jsonOk({});
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "revoke_failed");
        }
      },
    },
  },
});
