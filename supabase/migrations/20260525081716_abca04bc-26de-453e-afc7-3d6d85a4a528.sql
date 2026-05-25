-- 1) Column-level: never expose password_hash to authenticated/anon clients.
REVOKE SELECT (password_hash) ON public.hn_users FROM anon;
REVOKE SELECT (password_hash) ON public.hn_users FROM authenticated;
REVOKE SELECT (password_hash) ON public.hn_users FROM PUBLIC;

-- 2) Lock down SECURITY DEFINER helpers — only service_role may call them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_hn_users_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_hn_users_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_hn_users_updated_at() FROM authenticated;

-- 3) Pin search_path on all internal functions to mitigate schema-shadow attacks.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;