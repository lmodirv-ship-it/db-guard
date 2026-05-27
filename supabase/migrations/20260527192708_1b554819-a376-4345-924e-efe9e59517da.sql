
-- 1. Revoke password_hash column SELECT from authenticated/anon (owner reads should go through views/service role)
REVOKE SELECT (password_hash) ON public.hn_users FROM authenticated;
REVOKE SELECT (password_hash) ON public.hn_users FROM anon;

-- 2. Restrict has_role() EXECUTE — SECURITY DEFINER functions should not be callable by anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- 3. Fix hn_sessions policy — user_id references hn_users.id, not auth.users.id
DROP POLICY IF EXISTS "users read own sessions" ON public.hn_sessions;
CREATE POLICY "users read own sessions"
ON public.hn_sessions
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM public.hn_users WHERE auth_user_id = auth.uid()
  )
);

-- 4. hn_api_logs has RLS enabled but no policies — lock it down to service_role only
CREATE POLICY "service role manages hn_api_logs"
ON public.hn_api_logs
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "owners read hn_api_logs"
ON public.hn_api_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));
