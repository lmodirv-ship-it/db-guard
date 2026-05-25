-- Ensure password_hash on hn_users is never readable by client roles
REVOKE SELECT (password_hash) ON public.hn_users FROM PUBLIC;
REVOKE SELECT (password_hash) ON public.hn_users FROM anon;
REVOKE SELECT (password_hash) ON public.hn_users FROM authenticated;

-- Lock down has_role() so only service_role can EXECUTE it directly.
-- RLS policies still evaluate it because policies run as the table owner.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;