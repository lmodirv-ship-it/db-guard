-- Workspaces (one per HN user)
CREATE TABLE public.hn_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hn_user_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hn_workspaces_user ON public.hn_workspaces(hn_user_id);
ALTER TABLE public.hn_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages hn_workspaces"
ON public.hn_workspaces FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "users read own workspace"
ON public.hn_workspaces FOR SELECT
USING (hn_user_id IN (
  SELECT id FROM public.hn_users WHERE auth_user_id = auth.uid()
));

-- Databases (default DB per workspace)
CREATE TABLE public.hn_databases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hn_workspaces(id) ON DELETE CASCADE,
  hn_user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'primary',
  region text NOT NULL DEFAULT 'hn-eu-1',
  status text NOT NULL DEFAULT 'provisioning',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hn_databases_user ON public.hn_databases(hn_user_id);
CREATE INDEX idx_hn_databases_workspace ON public.hn_databases(workspace_id);
ALTER TABLE public.hn_databases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages hn_databases"
ON public.hn_databases FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "users read own databases"
ON public.hn_databases FOR SELECT
USING (hn_user_id IN (
  SELECT id FROM public.hn_users WHERE auth_user_id = auth.uid()
));

-- API Keys (only hash + hint kept; raw key shown ONCE on creation)
CREATE TABLE public.hn_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hn_workspaces(id) ON DELETE CASCADE,
  hn_user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'default',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  key_hint text NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX idx_hn_api_keys_user ON public.hn_api_keys(hn_user_id);
CREATE INDEX idx_hn_api_keys_workspace ON public.hn_api_keys(workspace_id);
ALTER TABLE public.hn_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages hn_api_keys"
ON public.hn_api_keys FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "users read own api keys"
ON public.hn_api_keys FOR SELECT
USING (hn_user_id IN (
  SELECT id FROM public.hn_users WHERE auth_user_id = auth.uid()
));

-- Trigger to update updated_at on workspaces
CREATE TRIGGER update_hn_workspaces_updated_at
BEFORE UPDATE ON public.hn_workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_hn_users_updated_at();