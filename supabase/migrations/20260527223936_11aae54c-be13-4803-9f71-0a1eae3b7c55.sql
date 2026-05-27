
DROP VIEW IF EXISTS public.hn_users_admin_view;

-- Column-level lockdown: revoke ALL on hn_users from authenticated, then
-- grant only safe columns. password_hash stays service_role-only.
REVOKE SELECT ON public.hn_users FROM authenticated;
GRANT SELECT (
  id, hn_user_code, full_name, email, phone, status, plan,
  email_verified, registration_source, source_app,
  last_login_at, created_at, updated_at, auth_user_id
) ON public.hn_users TO authenticated;

-- Re-allow owner SELECT (column grant + RLS together restrict both row & column).
CREATE POLICY "owners read hn_users (safe columns only)"
ON public.hn_users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Invoker view for convenience; relies on column grants above so password_hash is unreachable.
CREATE VIEW public.hn_users_admin_view
WITH (security_invoker = true) AS
SELECT id, hn_user_code, full_name, email, phone, status, plan,
       email_verified, registration_source, source_app,
       last_login_at, created_at, updated_at, auth_user_id
FROM public.hn_users;

GRANT SELECT ON public.hn_users_admin_view TO authenticated;
GRANT ALL    ON public.hn_users_admin_view TO service_role;
