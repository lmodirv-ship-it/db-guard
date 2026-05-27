/**
 * HN Monitoring — metrics samples + system health snapshot.
 */
import { withBypass } from "@/lib/db/tenant.server";

export async function recordMetric(metric: string, value: number, scope: "global" | "tenant" | "site" = "global", scopeId?: string | null, meta: Record<string, unknown> = {}): Promise<void> {
  try {
    await withBypass((sql) => sql`
      INSERT INTO hn_metrics (bucket, metric, scope, scope_id, value, meta)
      VALUES (date_trunc('minute', now()), ${metric}, ${scope}, ${scopeId ?? null}, ${value}, ${JSON.stringify(meta)}::jsonb)
    `);
  } catch (e) {
    console.error("[hn-monitoring] record failed", metric, e);
  }
}

export async function heartbeat(worker: string, status: "idle" | "running" | "down" = "idle", meta: Record<string, unknown> = {}): Promise<void> {
  await withBypass((sql) => sql`
    INSERT INTO hn_workers (id, status, last_beat_at, meta)
    VALUES (${worker}, ${status}, now(), ${JSON.stringify(meta)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, last_beat_at=now(), meta=EXCLUDED.meta
  `);
}

export type SystemHealth = {
  database: { ok: boolean; latency_ms: number };
  queue: { queued: number; running: number; failed: number };
  workers: Array<{ id: string; status: string; last_beat_at: string; stale: boolean }>;
  sites: { total: number; active_24h: number };
  events_5m: number;
  errors_5m: number;
  requests_5m: number;
  uptime_seconds: number;
};

const startedAt = Date.now();

export async function systemHealth(): Promise<SystemHealth> {
  const t0 = Date.now();
  const pingRows = await withBypass<{ ok: number }>((sql) => sql`SELECT 1 AS ok`);
  const latency = Date.now() - t0;

  const [jobsAgg] = await withBypass<{ queued: string; running: string; failed: string }>((sql) => sql`
    SELECT
      count(*) FILTER (WHERE status='queued')::text AS queued,
      count(*) FILTER (WHERE status='running')::text AS running,
      count(*) FILTER (WHERE status='failed')::text AS failed
    FROM hn_jobs
  `);

  const workers = await withBypass<{ id: string; status: string; last_beat_at: string }>((sql) => sql`
    SELECT id, status, last_beat_at FROM hn_workers ORDER BY id
  `);

  const [siteAgg] = await withBypass<{ total: string; active_24h: string }>((sql) => sql`
    SELECT
      count(*)::text AS total,
      count(*) FILTER (WHERE updated_at > now() - interval '24 hours')::text AS active_24h
    FROM hn_sites
  `).catch(() => [{ total: "0", active_24h: "0" }]);

  const [evt] = await withBypass<{ n: string; errs: string }>((sql) => sql`
    SELECT
      count(*)::text AS n,
      count(*) FILTER (WHERE severity='error')::text AS errs
    FROM hn_events WHERE created_at > now() - interval '5 minutes'
  `);

  const [req] = await withBypass<{ s: string | null }>((sql) => sql`
    SELECT coalesce(sum(value),0)::text AS s FROM hn_metrics
    WHERE metric='requests' AND bucket > now() - interval '5 minutes'
  `);

  const now = Date.now();
  return {
    database: { ok: pingRows[0]?.ok === 1, latency_ms: latency },
    queue: {
      queued: Number(jobsAgg?.queued ?? 0),
      running: Number(jobsAgg?.running ?? 0),
      failed: Number(jobsAgg?.failed ?? 0),
    },
    workers: workers.map((w) => ({
      ...w,
      stale: now - new Date(w.last_beat_at).getTime() > 60_000,
    })),
    sites: {
      total: Number(siteAgg?.total ?? 0),
      active_24h: Number(siteAgg?.active_24h ?? 0),
    },
    events_5m: Number(evt?.n ?? 0),
    errors_5m: Number(evt?.errs ?? 0),
    requests_5m: Number(req?.s ?? 0),
    uptime_seconds: Math.floor((now - startedAt) / 1000),
  };
}

export async function metricSeries(metric: string, minutes = 60, scope: "global" | "tenant" | "site" = "global", scopeId?: string | null): Promise<Array<{ bucket: string; value: number }>> {
  const m = Math.min(Math.max(minutes, 1), 24 * 60);
  return withBypass<{ bucket: string; value: number }>((sql) => sql`
    SELECT bucket, sum(value)::float8 AS value
    FROM hn_metrics
    WHERE metric=${metric}
      AND scope=${scope}
      AND (${scopeId ?? null}::uuid IS NULL OR scope_id=${scopeId ?? null}::uuid)
      AND bucket > now() - (${m}::text || ' minutes')::interval
    GROUP BY bucket
    ORDER BY bucket ASC
  `);
}
