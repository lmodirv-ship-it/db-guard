/**
 * Cloudflare Queue consumer.
 * The TanStack Start server-entry exports the default `fetch` handler.
 * This module is referenced by wrangler's queue binding via a custom worker
 * wrapper (not auto-wired by Start). For now, the DB-backed `/api/jobs/drain`
 * endpoint provides a portable equivalent that processes up to 10 jobs in
 * parallel — call it from a cron or external scheduler.
 *
 * To wire the Queue consumer end-to-end, create `src/worker.ts` that
 * re-exports Start's fetch + the `queue` handler below, and point
 * wrangler's `main` at it. We keep the consumer logic here so it can be
 * imported by either path.
 */
import { processJob } from "@/lib/jobs/process.server";
import type { JobKind } from "@/lib/jobs/queue.server";
import { withBypass } from "@/lib/db/tenant.server";

type Msg = {
  body: { jobId: string; tenantId: string; projectId: string; kind: JobKind };
  ack: () => void;
  retry: () => void;
};

export async function handleQueueBatch(batch: { messages: Msg[] }) {
  await Promise.allSettled(
    batch.messages.map(async (msg) => {
      const { jobId } = msg.body;
      const rows = await withBypass<{
        id: string;
        tenant_id: string;
        project_id: string;
        kind: JobKind;
        payload: Record<string, unknown>;
        attempts: number;
        max_attempts: number;
      }>((sql) => sql`
        UPDATE jobs SET status = 'running', started_at = now(), attempts = attempts + 1
        WHERE id = ${jobId} AND status IN ('queued','running')
        RETURNING id, tenant_id, project_id, kind, payload, attempts, max_attempts
      `);
      const job = rows[0];
      if (!job) {
        msg.ack();
        return;
      }
      try {
        await processJob(job);
        msg.ack();
      } catch {
        msg.retry();
      }
    }),
  );
}
