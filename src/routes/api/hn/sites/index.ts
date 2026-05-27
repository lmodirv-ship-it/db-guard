/**
 * HN Sites — list + create site connections for the authed tenant.
 *
 *   GET  /api/hn/sites           — list sites
 *   POST /api/hn/sites           — create a new site
 *
 * Auth: HN bearer token (Authorization: Bearer hns_…)
 * Permissions: site.read / site.write
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { requireHnAccess, hnAccessErrorResponse } from "@/lib/hn/access.server";
import { withTenant } from "@/lib/db/tenant.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-HN-Token, Content-Type",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

const CreateSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,60}$/),
  name: z.string().trim().min(1).max(120),
  site_host: z.string().trim().min(1).max(255),
  allowed_origins: z.array(z.string().trim().url()).max(20).optional(),
  db_enabled: z.boolean().optional(),
  storage_enabled: z.boolean().optional(),
  auth_enabled: z.boolean().optional(),
});

export const Route = createFileRoute("/api/hn/sites/")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        try {
          const ctx = await requireHnAccess(request, "site.read");
          const rows = await withTenant(ctx.tenantId, (sql) => sql`
            SELECT id, slug, name, site_host, allowed_origins, status,
                   db_enabled, storage_enabled, auth_enabled, sso_app_key,
                   created_at, updated_at
            FROM hn_sites
            WHERE tenant_id = ${ctx.tenantId}
            ORDER BY created_at DESC
            LIMIT 200
          `);
          return json(200, { ok: true, sites: rows });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },

      POST: async ({ request }) => {
        try {
          const ctx = await requireHnAccess(request, "site.write");
          let body: unknown;
          try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
          const parsed = CreateSchema.safeParse(body);
          if (!parsed.success) return json(400, { ok: false, error: "invalid_input", issues: parsed.error.issues });
          const d = parsed.data;

          // ensure unique slug globally
          const dup = await withTenant<{ id: string }>(ctx.tenantId, (sql) => sql`
            SELECT id FROM hn_sites WHERE LOWER(slug) = ${d.slug} LIMIT 1
          `);
          if (dup.length) return json(409, { ok: false, error: "slug_taken" });

          // pick a workspace for this tenant (first one)
          const ws = await withTenant<{ id: string }>(ctx.tenantId, (sql) => sql`
            SELECT id FROM workspaces WHERE tenant_id = ${ctx.tenantId}
            ORDER BY is_default DESC, created_at ASC LIMIT 1
          `);
          if (!ws.length) return json(400, { ok: false, error: "no_workspace" });

          const rows = await withTenant(ctx.tenantId, (sql) => sql`
            INSERT INTO hn_sites (
              tenant_id, workspace_id, slug, name, site_host, allowed_origins,
              db_enabled, storage_enabled, auth_enabled
            ) VALUES (
              ${ctx.tenantId}, ${ws[0].id}, ${d.slug}, ${d.name}, ${d.site_host},
              ${d.allowed_origins ?? []},
              ${d.db_enabled ?? true}, ${d.storage_enabled ?? false}, ${d.auth_enabled ?? false}
            )
            RETURNING id, slug, name, site_host, allowed_origins, status,
                      db_enabled, storage_enabled, auth_enabled, created_at
          `);
          return json(200, { ok: true, site: rows[0] });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },
    },
  },
});
