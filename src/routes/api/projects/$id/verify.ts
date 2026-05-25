import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { normalizeProjectUrl, UrlValidationError } from "@/lib/projects/url.server";
import { verifyOwnership } from "@/lib/projects/verify.server";

export const Route = createFileRoute("/api/projects/$id/verify")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const session = await requireSession(request);
          const id = params.id;
          if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "invalid_id");

          const rows = await withTenant<{
            id: string;
            site_url: string;
            verification_token: string;
            status: string;
          }>(session.tid, (sql) => sql`
            SELECT id, site_url, verification_token, status
            FROM projects
            WHERE tenant_id = ${session.tid} AND id = ${id}
            LIMIT 1
          `);
          if (rows.length === 0) return jsonError(404, "not_found");
          const project = rows[0];

          let site;
          try {
            site = normalizeProjectUrl(project.site_url);
          } catch (err) {
            if (err instanceof UrlValidationError) return jsonError(400, err.code);
            throw err;
          }

          // Mark as verifying
          await withTenant(session.tid, (sql) => sql`
            UPDATE projects SET status = 'verifying'
            WHERE tenant_id = ${session.tid} AND id = ${id}
          `);

          const result = await verifyOwnership(site, project.verification_token);

          if (result.ok) {
            await withTenant(session.tid, (sql) => sql`
              UPDATE projects
              SET status = 'verified',
                  verification_method = ${result.method},
                  verified_at = now(),
                  error_message = NULL
              WHERE tenant_id = ${session.tid} AND id = ${id}
            `);
            return jsonOk({ verified: true, method: result.method, detail: result.detail });
          }

          const reason = result.attempts.map((a) => `${a.method}:${a.reason}`).join(" | ");
          console.error("project_verify_failed", { id, attempts: result.attempts });
          await withTenant(session.tid, (sql) => sql`
            UPDATE projects
            SET status = 'pending', error_message = ${reason}
            WHERE tenant_id = ${session.tid} AND id = ${id}
          `);
          const safeAttempts = result.attempts.map((a) => ({ method: a.method, ok: a.ok }));
          return jsonError(422, "verification_failed", { attempts: safeAttempts });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("project_verify_failed", err);
          return jsonError(500, "verify_failed");
        }
      },
    },
  },
});
