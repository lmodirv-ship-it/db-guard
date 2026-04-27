/**
 * Postgres-backed jobs queue (works on Workers via Neon HTTP).
 *
 * Design:
 *  - enqueue(): inserts a row in `jobs` with status='queued'.
 *  - claimBatch(n): atomically picks up to N due jobs using
 *      SELECT ... FOR UPDATE SKIP LOCKED + UPDATE status='running'.
 *  - markSucceeded / markFailed: terminal transitions with retry/backoff
 *    and dead-letter on max_attempts.
 *  - runWorkerOnce(parallelism=10): one tick that processes up to N jobs
 *    concurrently. Designed to be invoked by a cron route every minute, or
 *    on demand from the API.
 *
 * NOTE: When Cloudflare Queues bindings are added, swap enqueue() to also
 * publish to the queue and replace runWorkerOnce() with a Queue consumer.
 * The job table remains the source of truth for status & retries.
 */
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "../env.server";

export type JobKind =
  | "verify"
  | "analyze"
  | "generate_schema"
  | "import"
  | "full_pipeline";

export type Job = {
  id: string;
  tenant_id: string;
  project_id: string;
  kind: JobKind;
  status: "queued" | "running" | "succeeded" | "failed" | "dead_letter";
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_at: string;
};

// Direct (non-pooled) connection so SELECT ... FOR UPDATE works in a tx.
let _direct: ReturnType<typeof neon> | null = null;
function direct() {
  if (_direct) return _direct;
  _direct = neon(requireEnv().HN_DB_DIRECT_URL);
  return _direct;
}

// Pooled HTTP for fire-and-forget single-statement ops.
let _pool: ReturnType<typeof neon> | null = null;
function pool() {
  if (_pool) return _pool;
  _pool = neon(requireEnv().HN_DB_URL);
  return _pool;
}

export async function enqueue(args: {
  tenantId: string;
  projectId: string;
  kind: JobKind;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
  delaySeconds?: number;
}): Promise<{ id: string }> {
  const sql = pool();
  const payload = JSON.stringify(args.payload ?? {});
  const max = args.maxAttempts ?? 5;
  const delay = Math.max(0, args.delaySeconds ?? 0);
  const rows = (await sql`
    INSERT INTO jobs (tenant_id, project_id, kind, payload, max_attempts, scheduled_at)
    VALUES (${args.tenantId}, ${args.projectId}, ${args.kind},
            ${payload}::jsonb, ${max}, now() + (${delay} || ' seconds')::interval)
    RETURNING id
  `) as Array<{ id: string }>;
  return rows[0];
}

/**
 * Atomically claim up to `limit` due jobs. Marks them as 'running' and
 * increments attempts. Uses FOR UPDATE SKIP LOCKED for safe concurrency
 * across multiple workers.
 */
export async function claimBatch(limit: number): Promise<Job[]> {
  const sql = direct();
  // Single CTE = single statement = OK on Neon HTTP.
  const rows = (await sql`
    WITH picked AS (
      SELECT id FROM jobs
      WHERE status = 'queued' AND scheduled_at <= now()
      ORDER BY scheduled_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE jobs j
       SET status = 'running',
           attempts = j.attempts + 1,
           started_at = now()
      FROM picked
     WHERE j.id = picked.id
    RETURNING j.id, j.tenant_id, j.project_id, j.kind, j.status,
              j.payload, j.attempts, j.max_attempts, j.last_error,
              j.scheduled_at
  `) as Job[];
  return rows;
}

export async function markSucceeded(id: string): Promise<void> {
  const sql = pool();
  await sql`
    UPDATE jobs
       SET status = 'succeeded',
           finished_at = now(),
           last_error = NULL
     WHERE id = ${id}
  `;
}

/** Exponential backoff: 30s, 2m, 8m, 30m, 2h (capped). */
function backoffSeconds(attempt: number): number {
  const base = 30;
  const max = 7200;
  return Math.min(max, base * Math.pow(4, Math.max(0, attempt - 1)));
}

export async function markFailed(id: string, error: string): Promise<void> {
  const sql = pool();
  // If attempts >= max_attempts → dead_letter. Else re-queue with backoff.
  const rows = (await sql`
    SELECT attempts, max_attempts FROM jobs WHERE id = ${id}
  `) as Array<{ attempts: number; max_attempts: number }>;
  if (rows.length === 0) return;
  const { attempts, max_attempts } = rows[0];
  const trimmed = error.slice(0, 4000);

  if (attempts >= max_attempts) {
    await sql`
      UPDATE jobs
         SET status = 'dead_letter',
             finished_at = now(),
             last_error = ${trimmed}
       WHERE id = ${id}
    `;
    return;
  }
  const delay = backoffSeconds(attempts);
  await sql`
    UPDATE jobs
       SET status = 'queued',
           scheduled_at = now() + (${delay} || ' seconds')::interval,
           last_error = ${trimmed},
           started_at = NULL
     WHERE id = ${id}
  `;
}

export type JobHandler = (job: Job) => Promise<void>;

/**
 * Process up to `parallelism` jobs concurrently. Returns counts for
 * observability. Safe to call from a cron route or manual trigger.
 */
export async function runWorkerOnce(
  handler: JobHandler,
  parallelism = 10,
): Promise<{ claimed: number; succeeded: number; failed: number }> {
  const claimed = await claimBatch(parallelism);
  if (claimed.length === 0) return { claimed: 0, succeeded: 0, failed: 0 };

  const results = await Promise.allSettled(
    claimed.map(async (job) => {
      try {
        await handler(job);
        await markSucceeded(job.id);
        return "ok";
      } catch (err) {
        await markFailed(
          job.id,
          err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        );
        throw err;
      }
    }),
  );

  let succeeded = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled") succeeded++;
    else failed++;
  }
  return { claimed: claimed.length, succeeded, failed };
}

/** Stats for the dashboard. */
export async function queueStats(tenantId: string): Promise<{
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  dead_letter: number;
}> {
  const sql = pool();
  const rows = (await sql`
    SELECT status, COUNT(*)::int AS n
      FROM jobs
     WHERE tenant_id = ${tenantId}
     GROUP BY status
  `) as Array<{ status: string; n: number }>;
  const out = { queued: 0, running: 0, succeeded: 0, failed: 0, dead_letter: 0 };
  for (const r of rows) {
    if (r.status in out) (out as Record<string, number>)[r.status] = r.n;
  }
  return out;
}
