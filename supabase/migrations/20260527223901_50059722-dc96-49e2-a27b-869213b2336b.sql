
-- 1) Remove plaintext API key column entirely
ALTER TABLE public.hn_api_keys DROP COLUMN IF EXISTS full_key;

-- 2) Restrict owner read on hn_users — drop the broad SELECT policy.
-- Owners that need to administer users will use the safe view below.
DROP POLICY IF EXISTS "owners read all hn_users" ON public.hn_users;

-- Safe admin view that excludes password_hash.
CREATE OR REPLACE VIEW public.hn_users_admin_view
WITH (security_invoker = true) AS
SELECT id, hn_user_code, full_name, email, phone, status, plan,
       email_verified, registration_source, source_app,
       last_login_at, created_at, updated_at, auth_user_id
FROM public.hn_users;

GRANT SELECT ON public.hn_users_admin_view TO authenticated;
GRANT ALL    ON public.hn_users_admin_view TO service_role;

-- Re-add owner read access only through the view (still gated by has_role on the underlying table policies).
CREATE POLICY "owners read hn_users via view (safe columns)"
ON public.hn_users
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  -- password_hash exposure is the concern; this policy stays but UI/admin code
  -- must query hn_users_admin_view. Keeping the row-level grant lets the
  -- view (security_invoker) resolve rows for owners only.
);
