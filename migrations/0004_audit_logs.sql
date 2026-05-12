-- 0004_audit_logs.sql
-- Append-only audit trail for owner-console actions.

CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts             TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id      UUID,
  actor_user_id  UUID,
  actor_email    TEXT,
  action         TEXT NOT NULL,
  target         TEXT,
  meta           JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip             TEXT,
  user_agent     TEXT
);

CREATE INDEX IF NOT EXISTS audit_logs_ts_idx        ON audit_logs (ts DESC);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_ts_idx ON audit_logs (tenant_id, ts DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx    ON audit_logs (action);
