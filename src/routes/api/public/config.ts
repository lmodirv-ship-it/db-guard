/**
 * HN Connect — public site configuration endpoint.
 *
 *   GET /api/public/config?site=<slug>
 *
 * Returns the *non-secret* configuration a browser needs to use the HN SDK:
 *   { ok, site: { slug, host, app_key, allowed_origins, features } }
 *
 * No API key is exposed. All subsequent data/storage calls are authorized
 * by the slug + Origin pair, validated server-side.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifySiteSlug } from "@/lib/platform/verify-site.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "300",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/config")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const slug = new URL(request.url).searchParams.get("site");
        const origin = request.headers.get("origin");
        const { site, reason } = await verifySiteSlug(slug, origin);
        if (!site) return json(reason === "origin_not_allowed" ? 403 : 404, { ok: false, error: reason });

        return json(200, {
          ok: true,
          site: {
            slug: site.slug,
            host: site.site_host,
            app_key: site.sso_app_key ?? site.slug,
            allowed_origins: site.allowed_origins,
            features: {
              data: site.data_enabled,
              storage: site.storage_enabled,
              auth: site.auth_enabled,
            },
            base_url: new URL(request.url).origin,
          },
        });
      },
    },
  },
});
