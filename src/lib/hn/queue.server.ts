/**
 * HN Queue — minimal background-job system backed by Postgres.
 * Producers call enqueue(); workers call claim() + complete()/fail().
 */
import { withBypass } from "@/lib/db/tenant.server";
import { emit } from "./events.server";

export type JobKind = "discovery" | "analytics" | "upload" | "cleanup" | "verification" | "generic";
export type JobStatus = "queued" | "running" | "done" | "failed" | "delayed";

export type Job = {
  id: string;
  tenant_id: string | null;
  site_id: string | null;
  kind: JobKind;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  last_error: string | null;
  run_after: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EnqueueOpts = {
  kind: JobKind;
  payload?: Record<string, unknown>;
  tenantId?: string | null;
  siteId?: string | null;
  priority?: number;
  delaySeconds?: number;
  maxAttempts?: number;
};

export async function enqueue(opts: EnqueueOpts): Promise<Job> {
  const delay = opts.delaySeconds ?? 0;
  const initialStatus: JobStatus = delay > 0 ? "delayed" : "queued";
  const rows = await withBypass<Job>((sql) => sql`
    INSERT INTO hn_jobs (tenant_id, site_id, kind, status, priority, max_attempts, payload, run_after)
    VALUES (
      ${opts.tenantId ?? null}, ${opts.siteId ?? null}, ${opts.kind},
      ${initialStatus}, ${opts.priority ?? 0}, ${opts.maxAttempts ?? 3},
      ${JSON.stringify(opts.payload ?? {})}::jsonb,
      now() + (${delay}::text || ' seconds')::interval
    )
    RETURNING *
  `);
  const job = rows[0]!;
  await emit({ type: `job.enqueued`, payload: { id: job.id, kind: job.kind }, source: "queue" });
  return job;
}

export async function claim(kinds?: JobKind[], worker = "unknown"): Promise<Job | null> {
  const kindsArr = kinds && kinds.length ? kinds : null;
  const rows = await withBypass<Job>((sql) => sql`
    UPDATE hn_jobs
       SET status = 'running',
           started_at = now(),
           attempts = attempts + 1,
           updated_at = now()
     WHERE id = (
       SELECT id FROM hn_jobs
        WHERE status IN ('queued','delayed')
          AND run_after <= now()
          AND (${kindsArr}::text[] IS NULL OR kind = ANY(${kindsArr}::text[]))
        ORDER BY priority DESC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
     )
     RETURNING *
  `);
  const job = rows[0] ?? null;
  if (job) await emit({ type: "job.started", payload: { id: job.id, kind: job.kind, worker }, source: "worker" });
  return job;
}

export async function complete(id: string, result: Record<string, unknown> = {}): Promise<void> {
  await withBypass((sql) => sql`
    UPDATE hn_jobs SET status='done', finished_at=now(), updated_at=now(), result=${JSON.stringify(result)}::jsonb
    WHERE id=${id}
  `);
  await emit({ type: "job.completed", payload: { id }, source: "worker" });
}

export async function fail(id: string, error: string): Promise<void> {
  const rows = await withBypass<Job>((sql) => sql`
    UPDATE hn_jobs
       SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END,
           last_error = ${error},
           run_after = CASE WHEN attempts >= max_attempts THEN run_after
                            ELSE now() + (power(2, attempts)::text || ' seconds')::interval END,
           updated_at = now(),
           finished_at = CASE WHEN attempts >= max_attempts THEN now() ELSE NULL END
     WHERE id=${id}
     RETURNING *
  `);
  const j = rows[0];
  await emit({
    type: j?.status === "failed" ? "job.failed" : "job.retry",
    severity: j?.status === "failed" ? "error" : "warn",
    payload: { id, error, attempts: j?.attempts },
    source: "worker",
  });
}

export async function stats(): Promise<Record<JobStatus, number>> {
  const rows = await withBypass<{ status: JobStatus; n: string }>((sql) => sql`
    SELECT status, count(*)::text AS n FROM hn_jobs GROUP BY status
  `);
  const base: Record<JobStatus, number> = { queued: 0, running: 0, done: 0, failed: 0, delayed: 0 };
  for (const r of rows) base[r.status] = Number(r.n);
  return base;
}

export async function list(limit = 50, status?: JobStatus): Promise<Job[]> {
  const lim = Math.min(Math.max(limit, 1), 200);
  return withBypass<Job>((sql) => sql`
    SELECT * FROM hn_jobs
    WHERE (${status ?? null}::text IS NULL OR status = ${status ?? null})
    ORDER BY created_at DESC
    LIMIT ${lim}
  `);
}
