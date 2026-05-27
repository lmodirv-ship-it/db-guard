
CREATE TABLE public.hn_api_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL,
  workspace_id UUID,
  api_key_id UUID,
  hn_user_id UUID,
  origin TEXT,
  ip TEXT,
  user_agent TEXT,
  duration_ms INTEGER,
  request_bytes INTEGER,
  response_bytes INTEGER,
  error TEXT
);

CREATE INDEX idx_hn_api_logs_created_at ON public.hn_api_logs (created_at DESC);
CREATE INDEX idx_hn_api_logs_workspace ON public.hn_api_logs (workspace_id, created_at DESC);
CREATE INDEX idx_hn_api_logs_status ON public.hn_api_logs (status) WHERE status >= 400;

GRANT ALL ON public.hn_api_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.hn_api_logs_id_seq TO service_role;

ALTER TABLE public.hn_api_logs ENABLE ROW LEVEL SECURITY;

-- No client policies: server-only access via supabaseAdmin.
