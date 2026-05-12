import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
import { requireOwner } from "@/lib/auth/owner.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";

export const Route = createFileRoute("/api/admin/audit-logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireOwner(request);
          const url = new URL(request.url);
          const limit = Math.min(
            Math.max(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 1),
            500,
          );
          const sql = getSql();
          const rows = (await sql`
            SELECT id, ts, action, target, actor_user_id, actor_email, ip, user_agent, meta
            FROM audit_logs
            WHERE tenant_id = ${session.tid} OR tenant_id IS NULL
            ORDER BY ts DESC
            LIMIT ${limit}
          `) as Array<Record<string, unknown>>;
          return jsonOk({ logs: rows });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("audit_list_failed", err);
          return jsonError(500, "audit_list_failed");
        }
      },
    },
  },
});
