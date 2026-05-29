import { createFileRoute } from "@tanstack/react-router";
import { metricSeries } from "@/lib/hn/monitoring.server";
import { guardRuntime } from "@/lib/hn/runtime-guard.server";

export const Route = createFileRoute("/api/hn/runtime/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await guardRuntime(request);
        if (denied) return denied;
        const u = new URL(request.url);
        const metric = u.searchParams.get("metric") ?? "requests";
        const minutes = Number(u.searchParams.get("minutes") ?? "60");
        const scope = (u.searchParams.get("scope") ?? "global") as "global" | "tenant" | "site";
        const scopeId = u.searchParams.get("scope_id") ?? undefined;
        const series = await metricSeries(metric, minutes, scope, scopeId);
        return Response.json({ ok: true, metric, series });
      },
    },
  },
});
