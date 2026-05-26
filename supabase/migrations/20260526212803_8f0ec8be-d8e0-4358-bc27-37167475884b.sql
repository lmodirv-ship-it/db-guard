REVOKE EXECUTE ON FUNCTION public.get_public_tables() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_tables() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_tables() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_tables() TO postgres;
GRANT EXECUTE ON FUNCTION public.get_public_tables() TO service_role;