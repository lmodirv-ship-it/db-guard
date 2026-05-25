REVOKE ALL ON FUNCTION public.generate_hn_user_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_hn_user_code() FROM anon;
REVOKE ALL ON FUNCTION public.generate_hn_user_code() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.generate_hn_user_code() TO service_role;