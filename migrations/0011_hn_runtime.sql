-- HN-DB Runtime Platform: events, jobs, metrics
-- Event bus
CREATE TABLE IF NOT EXISTS hn_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid,
  site_id      uuid,
  type         text NOT NULL,           -- site.created, auth.login, sdk.error, ...
  severity     text NOT NULL DEFAULT 'info', -- info|warn|error
  source       text,                    -- sdk|dashboard|worker|api
  actor        text,                    -- user id / api key prefix / system
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_events_type_idx ON hn_events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS hn_events_tenant_idx ON hn_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hn_events_site_idx ON hn_events(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hn_events_severity_idx ON hn_events(severity, created_at DESC) WHERE severity <> 'info';

-- Queue / background jobs
CREATE TABLE IF NOT EXISTS hn_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid,
  site_id       uuid,
  kind          text NOT NULL,            -- discovery|analytics|upload|cleanup|verification|generic
  status        text NOT NULL DEFAULT 'queued', -- queued|running|done|failed|delayed
  priority      int  NOT NULL DEFAULT 0,
  attempts      int  NOT NULL DEFAULT 0,
  max_attempts  int  NOT NULL DEFAULT 3,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  result        jsonb,
  last_error    text,
  run_after     timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_jobs_pick_idx ON hn_jobs(status, run_after, priority DESC) WHERE status IN ('queued','delayed');
CREATE INDEX IF NOT EXISTS hn_jobs_kind_idx ON hn_jobs(kind, created_at DESC);

-- Metrics samples (time-series rollups)
CREATE TABLE IF NOT EXISTS hn_metrics (
  id          bigserial PRIMARY KEY,
  bucket      timestamptz NOT NULL,      -- minute bucket
  metric      text NOT NULL,             -- requests, errors, latency_ms, storage_bytes, active_sites...
  scope       text NOT NULL DEFAULT 'global', -- global|tenant|site
  scope_id    uuid,
  value       double precision NOT NULL,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS hn_metrics_lookup_idx ON hn_metrics(metric, scope, scope_id, bucket DESC);
CREATE INDEX IF NOT EXISTS hn_metrics_bucket_idx ON hn_metrics(bucket DESC);

-- Worker heartbeats
CREATE TABLE IF NOT EXISTS hn_workers (
  id            text PRIMARY KEY,        -- worker name e.g. discovery-runner
  status        text NOT NULL DEFAULT 'idle', -- idle|running|down
  last_beat_at  timestamptz NOT NULL DEFAULT now(),
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hn_events  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hn_jobs    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hn_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hn_workers TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE hn_metrics_id_seq TO authenticated;
GRANT ALL ON public.hn_events, public.hn_jobs, public.hn_metrics, public.hn_workers TO service_role;
GRANT USAGE, SELECT ON SEQUENCE hn_metrics_id_seq TO service_role;
