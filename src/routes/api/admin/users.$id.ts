import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
import { requireOwner } from "@/lib/auth/owner.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { audit } from "@/lib/audit/log.server";
import { isProtectedOwnerEmail } from "@/lib/auth/protected-owner.server";

export const Route = createFileRoute("/api/admin/users/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          const session = await requireOwner(request);
          if (params.id === session.sub) {
            return jsonError(400, "cannot_delete_self");
          }
          const sql = getSql();
          const target = (await sql`
            SELECT email FROM users
            WHERE id = ${params.id} AND tenant_id = ${session.tid}
            LIMIT 1
          `) as Array<{ email: string }>;
          if (target.length === 0) return jsonError(404, "not_found");
          if (isProtectedOwnerEmail(target[0].email)) {
            return jsonError(403, "protected_owner");
          }
          const rows = (await sql`
            DELETE FROM users
            WHERE id = ${params.id} AND tenant_id = ${session.tid}
            RETURNING id
          `) as Array<{ id: string }>;
          if (rows.length === 0) return jsonError(404, "not_found");
          await audit({
            action: "user.deleted",
            actorUserId: session.sub,
            tenantId: session.tid,
            target: rows[0].id,
            request,
          });
          return jsonOk({ deleted: rows[0].id });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("user_delete_failed", err);
          return jsonError(500, "delete_failed");
        }
      },
    },
  },
});
