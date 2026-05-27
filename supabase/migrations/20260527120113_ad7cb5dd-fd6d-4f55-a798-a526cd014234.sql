CREATE TABLE public.hn_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hn_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  site_url text NOT NULL,
  site_host text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  auth_enabled boolean NOT NULL DEFAULT false,
  storage_enabled boolean NOT NULL DEFAULT false,
  data_enabled boolean NOT NULL DEFAULT true,
  sso_app_key text,
  storage_scope text NOT NULL DEFAULT 'private',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hn_sites_host_format CHECK (site_host ~ '^[a-z0-9.-]+$'),
  CONSTRAINT hn_sites_status_check CHECK (status IN ('active', 'disabled', 'pending')),
  CONSTRAINT hn_sites_storage_scope_check CHECK (storage_scope IN ('private', 'public')),
  CONSTRAINT hn_sites_workspace_url_unique UNIQUE (workspace_id, site_url),
  CONSTRAINT hn_sites_sso_app_key_unique UNIQUE (sso_app_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hn_sites TO authenticated;
GRANT ALL ON public.hn_sites TO service_role;
ALTER TABLE public.hn_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage their workspace sites"
  ON public.hn_sites
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM public.hn_workspaces w
      JOIN public.hn_users u ON u.id = w.hn_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM public.hn_workspaces w
      JOIN public.hn_users u ON u.id = w.hn_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );
CREATE POLICY "service role manages hn_sites"
  ON public.hn_sites
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE public.hn_storage_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hn_workspaces(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.hn_sites(id) ON DELETE SET NULL,
  object_key text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  visibility text NOT NULL DEFAULT 'private',
  uploaded_by_hn_user_id uuid REFERENCES public.hn_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hn_storage_objects_visibility_check CHECK (visibility IN ('private', 'public')),
  CONSTRAINT hn_storage_objects_size_nonnegative CHECK (size_bytes >= 0),
  CONSTRAINT hn_storage_objects_workspace_key_unique UNIQUE (workspace_id, object_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hn_storage_objects TO authenticated;
GRANT ALL ON public.hn_storage_objects TO service_role;
ALTER TABLE public.hn_storage_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage their workspace storage objects"
  ON public.hn_storage_objects
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM public.hn_workspaces w
      JOIN public.hn_users u ON u.id = w.hn_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM public.hn_workspaces w
      JOIN public.hn_users u ON u.id = w.hn_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );
CREATE POLICY "service role manages hn_storage_objects"
  ON public.hn_storage_objects
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_hn_sites_workspace_created ON public.hn_sites(workspace_id, created_at DESC);
CREATE INDEX idx_hn_sites_host ON public.hn_sites(site_host);
CREATE INDEX idx_hn_storage_objects_workspace_created ON public.hn_storage_objects(workspace_id, created_at DESC);
CREATE INDEX idx_hn_storage_objects_site_id ON public.hn_storage_objects(site_id);

CREATE TRIGGER trg_hn_sites_updated_at
  BEFORE UPDATE ON public.hn_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_hn_users_updated_at();

CREATE TRIGGER trg_hn_storage_objects_updated_at
  BEFORE UPDATE ON public.hn_storage_objects
  FOR EACH ROW EXECUTE FUNCTION public.update_hn_users_updated_at();