
-- 1. Extend hn_users
ALTER TABLE public.hn_users
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS registration_source text;

-- 2. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service role manages user_roles" ON public.user_roles;
CREATE POLICY "service role manages user_roles" ON public.user_roles FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 3. Connected apps
CREATE TABLE IF NOT EXISTS public.connected_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key text NOT NULL UNIQUE,
  name text NOT NULL,
  allowed_redirect_hosts text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.connected_apps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads connected_apps" ON public.connected_apps;
CREATE POLICY "anyone reads connected_apps" ON public.connected_apps FOR SELECT USING (true);
DROP POLICY IF EXISTS "service role manages connected_apps" ON public.connected_apps;
CREATE POLICY "service role manages connected_apps" ON public.connected_apps FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.connected_apps (app_key, name, allowed_redirect_hosts) VALUES
  ('dbguard', 'DB-GUARD', ARRAY['db-guard.lovable.app','*.lovable.app']),
  ('chat', 'HN Chat', ARRAY['*.hnchat.net','*.lovable.app']),
  ('groupe', 'HN Groupe', ARRAY['*.hnchat.net','*.lovable.app']),
  ('driver', 'HN Driver', ARRAY['*.hnchat.net','*.lovable.app']),
  ('souk', 'HN Souk', ARRAY['*.hnchat.net','*.lovable.app'])
ON CONFLICT (app_key) DO NOTHING;

-- 4. SSO tickets
CREATE TABLE IF NOT EXISTS public.hn_sso_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  hn_user_code text NOT NULL,
  source_app text,
  target_app text NOT NULL,
  redirect_url text NOT NULL,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hn_sso_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role manages sso_tickets" ON public.hn_sso_tickets;
CREATE POLICY "service role manages sso_tickets" ON public.hn_sso_tickets FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 5. Extend hn_sessions
ALTER TABLE public.hn_sessions
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

DROP POLICY IF EXISTS "users read own sessions" ON public.hn_sessions;
CREATE POLICY "users read own sessions" ON public.hn_sessions FOR SELECT USING (auth.uid() = user_id);

-- 6. Password reset
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  code_hash text NOT NULL,
  channel text NOT NULL DEFAULT 'otp',
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role manages reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "service role manages reset_tokens" ON public.password_reset_tokens FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.password_reset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  action text NOT NULL,
  ip text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.password_reset_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role manages reset_logs" ON public.password_reset_logs;
CREATE POLICY "service role manages reset_logs" ON public.password_reset_logs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "owners read reset_logs" ON public.password_reset_logs;
CREATE POLICY "owners read reset_logs" ON public.password_reset_logs FOR SELECT USING (public.has_role(auth.uid(), 'owner'));

-- 7. registered_users view (Owner Dashboard)
CREATE OR REPLACE VIEW public.registered_users AS
SELECT
  u.id,
  u.hn_user_code,
  u.email,
  u.full_name,
  u.phone,
  u.email_verified,
  COALESCE(u.source_app, u.registration_source, 'dbguard') AS source_app,
  u.registration_source,
  u.plan,
  u.status,
  u.last_login_at,
  u.created_at,
  u.updated_at
FROM public.hn_users u;

-- Owners can read all hn_users
DROP POLICY IF EXISTS "owners read all hn_users" ON public.hn_users;
CREATE POLICY "owners read all hn_users" ON public.hn_users FOR SELECT USING (public.has_role(auth.uid(), 'owner'));

-- 8. Grant owner role to indo@hnchat.net if present
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT auth_user_id INTO v_uid FROM public.hn_users WHERE email = 'indo@hnchat.net' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'owner') ON CONFLICT DO NOTHING;
  END IF;
END $$;
