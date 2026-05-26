/**
 * Manual drain endpoint — claims up to 10 pending jobs and processes them
 * in parallel. Useful in local dev (no Queue binding) and as ops backstop.
 *
 * Auth: caller must be an authenticated user; only their tenant's jobs are
 * processed (defense-in-depth — claim itself bypasses RLS but we filter).
 */
import { createFileRoute } from "@tanstack/react-router";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { requireOwner } from "@/lib/auth/owner.server";
import { claimNextJobs } from "@/lib/jobs/queue.server";
import { processJob } from "@/lib/jobs/process.server";

export const Route = createFileRoute("/api/jobs/drain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await requireOwner(request);
          const claimed = await claimNextJobs(10);
          // filter to caller's tenant (jobs from other tenants stay queued)
          const mine = claimed.filter((j) => j.tenant_id === session.tid);

          // process in parallel, capped at 10
          const results = await Promise.allSettled(mine.map((j) => processJob(j)));
          const summary = results.map((r, i) => ({
            jobId: mine[i].id,
            ok: r.status === "fulfilled",
            error: r.status === "rejected" ? String(r.reason?.message ?? r.reason) : null,
          }));
          return jsonOk({ processed: summary.length, results: summary });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("drain_failed", err);
          return jsonError(500, "drain_failed");
        }
      },
    },
  },
});
