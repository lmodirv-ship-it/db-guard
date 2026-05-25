
-- Simple ID-based temporary user system
CREATE TABLE IF NOT EXISTS public.id_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login_id text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_id_users_login_id ON public.id_users(login_id);
CREATE INDEX IF NOT EXISTS idx_id_users_email ON public.id_users(email);

ALTER TABLE public.id_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages id_users"
  ON public.id_users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "owners read all id_users"
  ON public.id_users FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'));

-- Per-user records scoped by id_users.id (separate from existing user_records which uses auth.uid)
CREATE TABLE IF NOT EXISTS public.id_user_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.id_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_id_user_records_owner ON public.id_user_records(owner_id);

ALTER TABLE public.id_user_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages id_user_records"
  ON public.id_user_records FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
