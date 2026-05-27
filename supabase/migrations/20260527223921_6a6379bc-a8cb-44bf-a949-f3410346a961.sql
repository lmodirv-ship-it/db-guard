
-- Remove owner SELECT on base table; password_hash must stay service_role-only.
DROP POLICY IF EXISTS "owners read hn_users via view (safe columns)" ON public.hn_users;

-- Recreate the admin view as SECURITY DEFINER (default) with an internal owner gate.
DROP VIEW IF EXISTS public.hn_users_admin_view;

CREATE VIEW public.hn_users_admin_view AS
SELECT id, hn_user_code, full_name, email, phone, status, plan,
       email_verified, registration_source, source_app,
       last_login_at, created_at, updated_at, auth_user_id
FROM public.hn_users
WHERE public.has_role(auth.uid(), 'owner'::app_role);

GRANT SELECT ON public.hn_users_admin_view TO authenticated;
GRANT ALL    ON public.hn_users_admin_view TO service_role;
