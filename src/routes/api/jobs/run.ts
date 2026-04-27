/**
 * Worker tick endpoint.
 * - POST /api/jobs/run                — authenticated user can run their tenant's jobs.
 *   (Returns global stats; the runner itself processes jobs across tenants.)
 *
 * In production, configure a scheduled trigger (Cloudflare cron) to call this
 * route every minute. Authentication: requires a valid session cookie.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  requireSession,
  jsonError,
  jsonOk,
  AuthError,
} from "@/lib/auth/session.server";
import { runWorkerOnce, queueStats } from "@/lib/queue/queue.server";
import { dispatch } from "@/lib/queue/handlers.server";

export const Route = createFileRoute("/api/jobs/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await requireSession(request);
          const result = await runWorkerOnce(dispatch, 10);
          const stats = await queueStats(session.tid);
          return jsonOk({ tick: result, tenantStats: stats });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("jobs_run_failed", err);
          return jsonError(500, "jobs_run_failed");
        }
      },
    },
  },
});
