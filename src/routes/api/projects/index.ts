import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { normalizeProjectUrl, UrlValidationError } from "@/lib/projects/url.server";

const CreateSchema = z.object({
  url: z.string().min(3).max(2048),
});

export const Route = createFileRoute("/api/projects/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireSession(request);
          const rows = await withTenant<{
            id: string;
            site_url: string;
            status: string;
            verified_at: string | null;
            created_at: string;
          }>(session.tid, (sql) => sql`
            SELECT id, site_url, status, verified_at, created_at
            FROM projects
            WHERE tenant_id = ${session.tid}
            ORDER BY created_at DESC
            LIMIT 100
          `);
          return jsonOk({ projects: rows });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("projects_list_failed", err);
          return jsonError(500, "list_failed");
        }
      },

      POST: async ({ request }) => {
        try {
          const session = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = CreateSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");

          let site;
          try {
            site = normalizeProjectUrl(parsed.data.url);
          } catch (err) {
            if (err instanceof UrlValidationError) return jsonError(400, err.code);
            throw err;
          }

          const rows = await withTenant<{
            id: string;
            verification_token: string;
            site_url: string;
            status: string;
          }>(session.tid, (sql) => sql`
            INSERT INTO projects (tenant_id, created_by, site_url, status)
            VALUES (${session.tid}, ${session.sub}, ${site.normalized}, 'pending')
            RETURNING id, verification_token, site_url, status
          `);
          const project = rows[0];
          return jsonOk({
            project,
            verification: {
              token: project.verification_token,
              instructions: {
                well_known: `Place file at ${site.origin}/.well-known/hn-verify-${project.verification_token}.txt containing the token.`,
                dns_txt: `Add a TXT record on _hn-verify.${site.hostname} with value: ${project.verification_token}`,
                meta_tag: `Add <meta name="hn-verify" content="${project.verification_token}"> to ${site.normalized}`,
              },
            },
          });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("project_create_failed", err);
          return jsonError(500, "create_failed");
        }
      },
    },
  },
});
