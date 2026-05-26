REVOKE EXECUTE ON FUNCTION public.list_public_tables() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_tables() TO service_role;