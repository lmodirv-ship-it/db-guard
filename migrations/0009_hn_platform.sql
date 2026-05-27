-- 0009_hn_platform.sql
-- HN-BD platform layer — fully independent from Supabase Auth / RLS.
-- Lives on Neon (HN_DB_URL). Provides:
--   • hn_sessions   — opaque bearer tokens, hashed at rest
--   • hn_roles + hn_permissions + hn_role_permissions
--   • hn_user_roles — assigns roles to platform users (public.users)
--   • hn_sites      — site-slug → tenant/workspace registry with allowed origins
--   • hn_site_keys  — per-site server-side secret (never sent to browser)
--
-- All tables tenant-scoped + RLS enabled, using the existing
-- current_tenant_id() / current_tenant_bypass() helpers from 0002_rls.sql.

-- ─────────────────────────────────────────────────────────────────
-- hn_sessions
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hn_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  token_hash     TEXT NOT NULL,                          -- sha256(hex) of opaque token
  token_prefix   TEXT NOT NULL,                          -- first 8 chars for display
  user_agent     TEXT,
  ip_address     TEXT,
  source_app     TEXT,                                   -- site slug or 'dashboard'
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hn_sessions_hash_unique ON hn_sessions (token_hash);
CREATE INDEX IF NOT EXISTS hn_sessions_user_idx          ON hn_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hn_sessions_tenant_idx        ON hn_sessions (tenant_id, created_at DESC);
ALTER TABLE hn_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hn_sessions_select ON hn_sessions;
CREATE POLICY hn_sessions_select ON hn_sessions FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hn_sessions_mod ON hn_sessions;
CREATE POLICY hn_sessions_mod ON hn_sessions FOR ALL
  USING      (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- hn_permissions  (catalog — system-wide, no tenant)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hn_permissions (
  code        TEXT PRIMARY KEY,           -- e.g. 'db.read', 'db.write', 'storage.upload'
  resource    TEXT NOT NULL,              -- 'db' | 'storage' | 'auth' | 'site' | 'admin'
  action      TEXT NOT NULL,              -- 'read' | 'write' | 'delete' | 'admin'
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE hn_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hn_permissions_read ON hn_permissions;
CREATE POLICY hn_permissions_read ON hn_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS hn_permissions_admin ON hn_permissions;
CREATE POLICY hn_permissions_admin ON hn_permissions FOR ALL
  USING (current_tenant_bypass()) WITH CHECK (current_tenant_bypass());

INSERT INTO hn_permissions (code, resource, action, description) VALUES
  ('db.read',        'db',      'read',   'Read records from collections'),
  ('db.write',       'db',      'write',  'Insert/update records'),
  ('db.delete',      'db',      'delete', 'Delete records'),
  ('db.admin',       'db',      'admin',  'Create/drop collections, alter schema'),
  ('storage.read',   'storage', 'read',   'Download/list files'),
  ('storage.upload', 'storage', 'write',  'Upload files'),
  ('storage.delete', 'storage', 'delete', 'Delete files'),
  ('auth.users.read','auth',    'read',   'List users'),
  ('auth.users.write','auth',   'write',  'Create/update users'),
  ('site.read',      'site',    'read',   'View site configuration'),
  ('site.write',     'site',    'write',  'Edit site configuration / origins'),
  ('admin.all',      'admin',   'admin',  'Full platform owner powers')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- hn_roles  (per-tenant, plus system roles where tenant_id IS NULL)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hn_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = system role
  slug        TEXT NOT NULL,              -- 'owner','admin','editor','viewer','member'
  name        TEXT NOT NULL,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hn_roles_system_unique
  ON hn_roles (LOWER(slug)) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS hn_roles_tenant_unique
  ON hn_roles (tenant_id, LOWER(slug)) WHERE tenant_id IS NOT NULL;
ALTER TABLE hn_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hn_roles_select ON hn_roles;
CREATE POLICY hn_roles_select ON hn_roles FOR SELECT
  USING (current_tenant_bypass() OR tenant_id IS NULL OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hn_roles_mod ON hn_roles;
CREATE POLICY hn_roles_mod ON hn_roles FOR ALL
  USING      (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

INSERT INTO hn_roles (slug, name, is_system, description) VALUES
  ('owner',  'Owner',  TRUE, 'Platform owner — full powers'),
  ('admin',  'Admin',  TRUE, 'Tenant administrator'),
  ('editor', 'Editor', TRUE, 'Read + write content'),
  ('viewer', 'Viewer', TRUE, 'Read-only access'),
  ('member', 'Member', TRUE, 'Default member')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- hn_role_permissions  (role ↔ permission)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hn_role_permissions (
  role_id         UUID NOT NULL REFERENCES hn_roles(id)        ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES hn_permissions(code) ON DELETE CASCADE,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_code)
);
ALTER TABLE hn_role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hn_role_perms_read ON hn_role_permissions;
CREATE POLICY hn_role_perms_read ON hn_role_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS hn_role_perms_admin ON hn_role_permissions;
CREATE POLICY hn_role_perms_admin ON hn_role_permissions FOR ALL
  USING (current_tenant_bypass()) WITH CHECK (current_tenant_bypass());

-- Seed system role permissions
INSERT INTO hn_role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM hn_roles r CROSS JOIN hn_permissions p
WHERE r.tenant_id IS NULL AND r.slug = 'owner'
ON CONFLICT DO NOTHING;

INSERT INTO hn_role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM hn_roles r CROSS JOIN hn_permissions p
WHERE r.tenant_id IS NULL AND r.slug = 'admin'
  AND p.code IN ('db.read','db.write','db.delete','db.admin',
                 'storage.read','storage.upload','storage.delete',
                 'auth.users.read','auth.users.write',
                 'site.read','site.write')
ON CONFLICT DO NOTHING;

INSERT INTO hn_role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM hn_roles r CROSS JOIN hn_permissions p
WHERE r.tenant_id IS NULL AND r.slug = 'editor'
  AND p.code IN ('db.read','db.write','db.delete',
                 'storage.read','storage.upload','site.read')
ON CONFLICT DO NOTHING;

INSERT INTO hn_role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM hn_roles r CROSS JOIN hn_permissions p
WHERE r.tenant_id IS NULL AND r.slug = 'viewer'
  AND p.code IN ('db.read','storage.read','site.read')
ON CONFLICT DO NOTHING;

INSERT INTO hn_role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM hn_roles r CROSS JOIN hn_permissions p
WHERE r.tenant_id IS NULL AND r.slug = 'member'
  AND p.code IN ('db.read','storage.read')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- hn_user_roles  (user ↔ role, scoped to a tenant)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hn_user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES hn_roles(id) ON DELETE CASCADE,
  granted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, role_id)
);
CREATE INDEX IF NOT EXISTS hn_user_roles_user_idx ON hn_user_roles (user_id);
CREATE INDEX IF NOT EXISTS hn_user_roles_tenant_idx ON hn_user_roles (tenant_id);
ALTER TABLE hn_user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hn_user_roles_select ON hn_user_roles;
CREATE POLICY hn_user_roles_select ON hn_user_roles FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hn_user_roles_mod ON hn_user_roles;
CREATE POLICY hn_user_roles_mod ON hn_user_roles FOR ALL
  USING      (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- hn_sites  (independent — replaces Supabase hn_sites)
-- A "site" is an external website that connects via:
--   <script src="https://hn-bd.online/hn.js" data-site="<slug>"></script>
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hn_sites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id)     ON DELETE CASCADE,
  workspace_id     UUID NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  name             TEXT NOT NULL,
  site_host        TEXT NOT NULL,
  allowed_origins  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','suspended','deleted')),
  auth_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  db_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  storage_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  storage_scope    TEXT NOT NULL DEFAULT 'private'
                   CHECK (storage_scope IN ('private','public')),
  sso_app_key      TEXT,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hn_sites_slug_unique ON hn_sites (LOWER(slug));
CREATE INDEX IF NOT EXISTS hn_sites_tenant_idx ON hn_sites (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hn_sites_workspace_idx ON hn_sites (workspace_id);
ALTER TABLE hn_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hn_sites_select ON hn_sites;
CREATE POLICY hn_sites_select ON hn_sites FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hn_sites_mod ON hn_sites;
CREATE POLICY hn_sites_mod ON hn_sites FOR ALL
  USING      (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_hn_sites_updated_at ON hn_sites;
CREATE TRIGGER trg_hn_sites_updated_at BEFORE UPDATE ON hn_sites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- hn_site_keys  (server-side secret per site; never sent to browser)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hn_site_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  site_id      UUID NOT NULL REFERENCES hn_sites(id)  ON DELETE CASCADE,
  key_prefix   TEXT NOT NULL,                          -- first 8 chars
  key_hash     TEXT NOT NULL,                          -- sha256(hex) of full secret
  label        TEXT NOT NULL DEFAULT 'default',
  scopes       TEXT[] NOT NULL DEFAULT ARRAY['db.read','db.write']::TEXT[],
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hn_site_keys_hash_unique ON hn_site_keys (key_hash);
CREATE INDEX IF NOT EXISTS hn_site_keys_site_idx ON hn_site_keys (site_id);
ALTER TABLE hn_site_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hn_site_keys_select ON hn_site_keys;
CREATE POLICY hn_site_keys_select ON hn_site_keys FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS hn_site_keys_mod ON hn_site_keys;
CREATE POLICY hn_site_keys_mod ON hn_site_keys FOR ALL
  USING      (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- has_permission(_user_id, _tenant_id, _perm)  — server-side check
-- SECURITY DEFINER so it can read across tenant scoping safely.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION hn_has_permission(
  _user_id  UUID,
  _tenant_id UUID,
  _perm     TEXT
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hn_user_roles ur
    JOIN hn_role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id    = _user_id
      AND ur.tenant_id  = _tenant_id
      AND rp.permission_code = _perm
  )
$$;

-- ─────────────────────────────────────────────────────────────────
-- Auto-grant owner role to the seeded platform owner
-- ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_user UUID;
  v_tenant UUID;
  v_role UUID;
BEGIN
  SELECT id, tenant_id INTO v_user, v_tenant
  FROM users WHERE LOWER(email) = 'lmodirv@gmail.com' LIMIT 1;

  IF v_user IS NULL THEN RETURN; END IF;

  SELECT id INTO v_role FROM hn_roles
  WHERE tenant_id IS NULL AND slug = 'owner' LIMIT 1;

  IF v_role IS NULL THEN RETURN; END IF;

  INSERT INTO hn_user_roles (tenant_id, user_id, role_id)
  VALUES (v_tenant, v_user, v_role)
  ON CONFLICT DO NOTHING;
END$$;
