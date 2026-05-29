/**
 * Worker tick — pulls the next job and processes it. Designed to be called
 * by a cron / external scheduler, or manually from the dashboard.
 */
import { createFileRoute } from "@tanstack/react-router";
import { claim, complete, fail, type JobKind } from "@/lib/hn/queue.server";
import { heartbeat, recordMetric } from "@/lib/hn/monitoring.server";
import { emit } from "@/lib/hn/events.server";

async function process(kind: JobKind, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Engine dispatch — minimal stubs for now. Each engine can grow into its own module.
  switch (kind) {
    case "discovery":
      return { handled: true, note: "discovery engine stub", ...payload };
    case "analytics":
      await recordMetric("analytics.processed", 1);
      return { handled: true };
    case "upload":
      return { handled: true };
    case "cleanup":
      return { handled: true };
    case "verification":
      return { handled: true };
    case "generic":
    default:
      return { handled: true };
  }
}

import { guardRuntime } from "@/lib/hn/runtime-guard.server";

export const Route = createFileRoute("/api/hn/runtime/worker/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await guardRuntime(request);
        if (denied) return denied;
        await heartbeat("runtime-worker", "running");
        const job = await claim(undefined, "runtime-worker");
        if (!job) {
          await heartbeat("runtime-worker", "idle");
          return Response.json({ ok: true, idle: true });
        }
        try {
          const result = await process(job.kind, job.payload);
          await complete(job.id, result);
          await heartbeat("runtime-worker", "idle");
          return Response.json({ ok: true, job: job.id, kind: job.kind, result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await fail(job.id, msg);
          await emit({ type: "sdk.error", severity: "error", source: "worker", payload: { jobId: job.id, error: msg } });
          await heartbeat("runtime-worker", "idle");
          return Response.json({ ok: false, job: job.id, error: msg }, { status: 500 });
        }
      },
    },
  },
});
