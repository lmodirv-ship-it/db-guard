import { createFileRoute } from "@tanstack/react-router";
import { list, stats, enqueue, type JobKind, type JobStatus } from "@/lib/hn/queue.server";
import { guardRuntime } from "@/lib/hn/runtime-guard.server";

export const Route = createFileRoute("/api/hn/runtime/jobs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await guardRuntime(request);
        if (denied) return denied;
        const u = new URL(request.url);
        const status = (u.searchParams.get("status") ?? undefined) as JobStatus | undefined;
        const limit = Number(u.searchParams.get("limit") ?? "50");
        const [jobs, agg] = await Promise.all([list(limit, status), stats()]);
        return Response.json({ ok: true, jobs, stats: agg });
      },
      POST: async ({ request }) => {
        const denied = await guardRuntime(request);
        if (denied) return denied;
        const body = (await request.json().catch(() => ({}))) as {
          kind?: JobKind;
          payload?: Record<string, unknown>;
          siteId?: string;
          delaySeconds?: number;
          priority?: number;
        };
        if (!body.kind) return Response.json({ ok: false, error: "kind required" }, { status: 400 });
        const job = await enqueue({
          kind: body.kind,
          payload: body.payload,
          siteId: body.siteId,
          delaySeconds: body.delaySeconds,
          priority: body.priority,
        });
        return Response.json({ ok: true, job });
      },
    },
  },
});
