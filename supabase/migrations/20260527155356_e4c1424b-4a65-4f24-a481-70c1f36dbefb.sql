
-- 1) Nullify any stored plaintext API keys (defense in depth)
UPDATE public.hn_api_keys SET full_key = NULL WHERE full_key IS NOT NULL;

-- 2) Revoke column-level SELECT on sensitive columns from authenticated/anon
REVOKE SELECT (password_hash) ON public.hn_users FROM authenticated;
REVOKE SELECT (password_hash) ON public.hn_users FROM anon;
REVOKE SELECT (full_key) ON public.hn_api_keys FROM authenticated;
REVOKE SELECT (full_key) ON public.hn_api_keys FROM anon;

-- 3) Restrict has_role() execution to service_role only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
