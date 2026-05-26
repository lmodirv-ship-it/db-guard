CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS TABLE (table_name text, row_count_est bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.table_name::text,
    COALESCE(c.reltuples, 0)::bigint AS row_count_est
  FROM information_schema.tables t
  LEFT JOIN pg_class c ON c.relname = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE';
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_tables() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tables() TO service_role;