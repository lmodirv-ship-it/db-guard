/**
 * HN Analytics — lightweight beacon ingest for HN SDK.
 *   POST /api/public/analytics  { event, props, ts, site }
 * Best-effort: never throws back to the SDK.
 */
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/analytics")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          // eslint-disable-next-line no-console
          console.log("[hn-analytics]", JSON.stringify(body));
        } catch {
          /* swallow */
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS },
        });
      },
    },
  },
});
