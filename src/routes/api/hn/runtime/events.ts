import { createFileRoute } from "@tanstack/react-router";
import { tail } from "@/lib/hn/events.server";

export const Route = createFileRoute("/api/hn/runtime/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const limit = Number(u.searchParams.get("limit") ?? "100");
        const type = u.searchParams.get("type") ?? undefined;
        const severity = (u.searchParams.get("severity") ?? undefined) as "info" | "warn" | "error" | undefined;
        const siteId = u.searchParams.get("site_id") ?? undefined;
        const events = await tail(limit, { type, severity, siteId });
        return Response.json({ ok: true, events });
      },
    },
  },
});
