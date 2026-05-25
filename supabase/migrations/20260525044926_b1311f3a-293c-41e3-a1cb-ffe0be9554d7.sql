
-- Generic per-user records
CREATE TABLE IF NOT EXISTS public.user_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'record',
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own records" ON public.user_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service role manages user_records" ON public.user_records
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_user_records_user_id ON public.user_records(user_id);

-- Per-user files (metadata only)
CREATE TABLE IF NOT EXISTS public.user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own files" ON public.user_files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service role manages user_files" ON public.user_files
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON public.user_files(user_id);

-- Per-user activity logs
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own activity" ON public.user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own activity" ON public.user_activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service role manages user_activity_logs" ON public.user_activity_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity_logs(user_id, created_at DESC);

-- DB·GUARD connection per user
CREATE TABLE IF NOT EXISTS public.dbguard_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  project_id TEXT,
  endpoint_url TEXT,
  api_key_hash TEXT,
  api_key_hint TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dbguard_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own connection" ON public.dbguard_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service role manages dbguard_connections" ON public.dbguard_connections
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Export logs
CREATE TABLE IF NOT EXISTS public.dbguard_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL,
  items_count INTEGER NOT NULL DEFAULT 0,
  payload_size INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dbguard_export_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own export logs" ON public.dbguard_export_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service role manages dbguard_export_logs" ON public.dbguard_export_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_export_logs_user ON public.dbguard_export_logs(user_id, created_at DESC);
