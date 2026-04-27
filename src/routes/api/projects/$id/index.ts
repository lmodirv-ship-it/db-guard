import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";

export const Route = createFileRoute("/api/projects/$id/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const session = await requireSession(request);
          const id = params.id;
          if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "invalid_id");

          const rows = await withTenant<{
            id: string;
            tenant_id: string;
            site_url: string;
            status: string;
            verification_method: string | null;
            verification_token: string;
            verified_at: string | null;
            schema_json: unknown;
            stats_json: unknown;
            error_message: string | null;
            created_at: string;
            updated_at: string;
          }>(session.tid, (sql) => sql`
            SELECT id, tenant_id, site_url, status, verification_method,
                   verification_token, verified_at, schema_json, stats_json,
                   error_message, created_at, updated_at
            FROM projects
            WHERE tenant_id = ${session.tid} AND id = ${id}
            LIMIT 1
          `);
          if (rows.length === 0) return jsonError(404, "not_found");
          return jsonOk({ project: rows[0] });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("project_get_failed", err);
          return jsonError(500, "get_failed");
        }
      },
    },
  },
});
