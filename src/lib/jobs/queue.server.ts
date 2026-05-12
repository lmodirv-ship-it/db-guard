/**
 * Job queue — DB is the source of truth (`jobs` table). Cloudflare Queues
 * is the transport: `enqueueJob` writes to DB then sends a message.
 *
 * The consumer (src/server/queue-consumer.server.ts) processes up to 10
 * messages in parallel (configured in wrangler.jsonc). Messages carry only
 * the job id; the consumer reloads the row, runs it, and updates status.
 *
 * If the Queue binding is unavailable (local dev), we still write the row;
 * an operator can drain via POST /api/jobs/drain.
 */
import { withBypass, withTenant } from "../db/tenant.server";
import { getJobsQueue } from "../cf-bindings.server";

export type JobKind = "verify" | "analyze" | "import" | "full_pipeline" | "generate_schema";

export type EnqueueInput = {
  tenantId: string;
  projectId: string;
  kind: JobKind;
  payload?: Record<string, unknown>;
};

export async function enqueueJob(input: EnqueueInput): Promise<{ id: string; queued: boolean }> {
  const payload = JSON.stringify(input.payload ?? {});
  const rows = await withTenant<{ id: string }>(input.tenantId, (sql) => sql`
    INSERT INTO jobs (tenant_id, project_id, kind, payload, status)
    VALUES (${input.tenantId}, ${input.projectId}, ${input.kind}, ${payload}::jsonb, 'queued')
    RETURNING id
  `);
  const id = rows[0]!.id;

  const queue = await getJobsQueue();
  if (queue) {
    await queue.send(
      { jobId: id, tenantId: input.tenantId, projectId: input.projectId, kind: input.kind },
      { contentType: "json" },
    );
    return { id, queued: true };
  }
  return { id, queued: false };
}

/**
 * Atomically claim the next N pending jobs. Used by the HTTP drain endpoint
 * (fallback when Queues isn't bound, or for ops triage).
 */
export async function claimNextJobs(limit: number) {
  return withBypass<{
    id: string;
    tenant_id: string;
    project_id: string;
    kind: JobKind;
    payload: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
  }>((sql) => sql`
    WITH next AS (
      SELECT id FROM jobs
      WHERE status = 'queued' AND scheduled_at <= now()
      ORDER BY scheduled_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE jobs SET status = 'running', started_at = now(), attempts = attempts + 1
    WHERE id IN (SELECT id FROM next)
    RETURNING id, tenant_id, project_id, kind, payload, attempts, max_attempts
  `);
}

export async function markJobSucceeded(jobId: string) {
  await withBypass((sql) => sql`
    UPDATE jobs SET status = 'succeeded', finished_at = now(), last_error = NULL
    WHERE id = ${jobId}
  `);
}

export async function markJobFailed(jobId: string, err: string, dead: boolean) {
  await withBypass((sql) => sql`
    UPDATE jobs
    SET status = ${dead ? "dead_letter" : "queued"}::text,
        last_error = ${err},
        finished_at = ${dead ? "now()" : null}::timestamptz,
        scheduled_at = CASE WHEN ${dead} THEN scheduled_at ELSE now() + interval '30 seconds' END
    WHERE id = ${jobId}
  `);
}
