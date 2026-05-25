-- HN Account: unified registration across HN apps
CREATE TABLE IF NOT EXISTS public.hn_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hn_user_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  password_hash text NOT NULL,
  source_app text,
  redirect_url text,
  email_verified boolean NOT NULL DEFAULT false,
  auth_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hn_users_email ON public.hn_users(email);
CREATE INDEX IF NOT EXISTS idx_hn_users_code ON public.hn_users(hn_user_code);

ALTER TABLE public.hn_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages hn_users"
  ON public.hn_users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "users read own hn_user"
  ON public.hn_users FOR SELECT
  USING (auth.uid() = auth_user_id);

-- HN sessions (issued after OTP verify, used to bridge back to source app)
CREATE TABLE IF NOT EXISTS public.hn_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.hn_users(id) ON DELETE CASCADE,
  hn_user_code text NOT NULL,
  source_app text,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hn_sessions_user ON public.hn_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_hn_sessions_token ON public.hn_sessions(token_hash);

ALTER TABLE public.hn_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages hn_sessions"
  ON public.hn_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Generate unique hn_user_code: letter + 6 digits (e.g. H384921)
CREATE OR REPLACE FUNCTION public.generate_hn_user_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
  letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  i int := 0;
BEGIN
  LOOP
    candidate := substr(letters, 1 + floor(random() * length(letters))::int, 1)
              || lpad(floor(random() * 1000000)::text, 6, '0');
    IF NOT EXISTS (SELECT 1 FROM public.hn_users WHERE hn_user_code = candidate) THEN
      RETURN candidate;
    END IF;
    i := i + 1;
    IF i > 50 THEN
      RAISE EXCEPTION 'Could not generate unique hn_user_code';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_hn_users_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hn_users_updated_at ON public.hn_users;
CREATE TRIGGER trg_hn_users_updated_at
  BEFORE UPDATE ON public.hn_users
  FOR EACH ROW EXECUTE FUNCTION public.update_hn_users_updated_at();