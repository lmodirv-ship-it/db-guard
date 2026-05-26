import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { normalizeProjectUrl, UrlValidationError } from "@/lib/projects/url.server";
import { analyzeAndExtract } from "@/lib/projects/analyze.server";

export const Route = createFileRoute("/api/projects/$id/analyze")({
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
            status: string;
            verified_at: string | null;
          }>(session.tid, (sql) => sql`
            SELECT id, site_url, status, verified_at
            FROM projects
            WHERE tenant_id = ${session.tid} AND id = ${id}
            LIMIT 1
          `);
          if (rows.length === 0) return jsonError(404, "not_found");
          const project = rows[0];
          if (!project.verified_at) {
            return jsonError(412, "not_verified");
          }

          let site;
          try {
            site = normalizeProjectUrl(project.site_url);
          } catch (err) {
            if (err instanceof UrlValidationError) return jsonError(400, err.code);
            throw err;
          }

          await withTenant(session.tid, (sql) => sql`
            UPDATE projects SET status = 'analyzing'
            WHERE tenant_id = ${session.tid} AND id = ${id}
          `);

          try {
            const { analysis, schema } = await analyzeAndExtract(site);
            await withTenant(session.tid, (sql) => sql`
              UPDATE projects
              SET status = 'generating_schema',
                  stats_json = ${JSON.stringify(analysis)}::jsonb,
                  schema_json = ${JSON.stringify(schema)}::jsonb,
                  error_message = NULL
              WHERE tenant_id = ${session.tid} AND id = ${id}
            `);
            return jsonOk({ analysis, schema });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "analyze_failed";
            await withTenant(session.tid, (sql) => sql`
              UPDATE projects
              SET status = 'failed', error_message = ${msg}
              WHERE tenant_id = ${session.tid} AND id = ${id}
            `);
            return jsonError(502, "analyze_failed", { detail: msg });
          }
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("project_analyze_failed", err);
          return jsonError(500, "analyze_failed");
        }
      },
    },
  },
});
