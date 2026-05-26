CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read','write','admin']::text[],
  status TEXT NOT NULL DEFAULT 'active',
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE UNIQUE INDEX idx_api_keys_hash ON public.api_keys(key_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own api_keys"
ON public.api_keys FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users insert own api_keys"
ON public.api_keys FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own api_keys"
ON public.api_keys FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users delete own api_keys"
ON public.api_keys FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.list_public_tables()
RETURNS TABLE(table_name text, row_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT c.relname::text AS table_name,
         COALESCE(c.reltuples, 0)::bigint AS row_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relname;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_tables() TO authenticated, service_role;