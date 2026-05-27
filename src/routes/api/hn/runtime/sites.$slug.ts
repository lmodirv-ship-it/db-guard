import { createFileRoute } from "@tanstack/react-router";
import { withBypass } from "@/lib/db/tenant.server";
import { tail } from "@/lib/hn/events.server";
import { metricSeries } from "@/lib/hn/monitoring.server";

type Site = {
  id: string;
  slug: string;
  site_url: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export const Route = createFileRoute("/api/hn/runtime/sites/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const rows = await withBypass<Site>((sql) => sql`
          SELECT id, slug, site_url, status, created_at, updated_at
          FROM hn_sites WHERE slug = ${params.slug} LIMIT 1
        `);
        const site = rows[0];
        if (!site) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
        const [events, requests, errors] = await Promise.all([
          tail(50, { siteId: site.id }),
          metricSeries("requests", 60, "site", site.id),
          metricSeries("errors", 60, "site", site.id),
        ]);
        return Response.json({ ok: true, site, events, requests, errors });
      },
    },
  },
});
