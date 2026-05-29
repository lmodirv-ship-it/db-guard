-- Lock down sensitive columns on hn_users: 'authenticated' role must NOT be
-- able to read password_hash. The 'owners read hn_users (safe columns only)'
-- policy was misleading — RLS is row-level only; column protection requires
-- explicit GRANT/REVOKE at the column level.
REVOKE SELECT ON public.hn_users FROM authenticated;
GRANT SELECT (
  id, hn_user_code, full_name, email, phone, plan, status,
  email_verified, auth_user_id, last_login_at, registration_source,
  source_app, redirect_url, created_at, updated_at
) ON public.hn_users TO authenticated;
-- password_hash is deliberately omitted. service_role keeps full access.
GRANT ALL ON public.hn_users TO service_role;

-- Storage: lock down the private 'hn-db' bucket so only the owning workspace
-- member (or service_role) can read/write objects. Object ownership is tracked
-- in public.hn_storage_objects.object_key (matches storage.objects.name).

-- Drop existing policies if they exist (idempotent re-run safety)
DROP POLICY IF EXISTS "hn-db owners select" ON storage.objects;
DROP POLICY IF EXISTS "hn-db owners insert" ON storage.objects;
DROP POLICY IF EXISTS "hn-db owners update" ON storage.objects;
DROP POLICY IF EXISTS "hn-db owners delete" ON storage.objects;

CREATE POLICY "hn-db owners select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'hn-db'
  AND EXISTS (
    SELECT 1
    FROM public.hn_storage_objects o
    JOIN public.hn_workspaces w ON w.id = o.workspace_id
    JOIN public.hn_users u ON u.id = w.hn_user_id
    WHERE o.object_key = storage.objects.name
      AND u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "hn-db owners insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hn-db'
  AND EXISTS (
    SELECT 1
    FROM public.hn_workspaces w
    JOIN public.hn_users u ON u.id = w.hn_user_id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "hn-db owners update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hn-db'
  AND EXISTS (
    SELECT 1
    FROM public.hn_storage_objects o
    JOIN public.hn_workspaces w ON w.id = o.workspace_id
    JOIN public.hn_users u ON u.id = w.hn_user_id
    WHERE o.object_key = storage.objects.name
      AND u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "hn-db owners delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hn-db'
  AND EXISTS (
    SELECT 1
    FROM public.hn_storage_objects o
    JOIN public.hn_workspaces w ON w.id = o.workspace_id
    JOIN public.hn_users u ON u.id = w.hn_user_id
    WHERE o.object_key = storage.objects.name
      AND u.auth_user_id = auth.uid()
  )
);