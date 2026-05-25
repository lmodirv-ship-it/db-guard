-- 0006_db_platform.sql
-- DB-GUARD as a multi-tenant database platform.
-- Adds: workspaces, dynamic db_tables/db_columns/db_records, api_keys,
--       plans + tenant subscription, tenant_usage, backups, team invites.
-- All tables tenant-scoped + RLS enabled.

-- ─────────────────────────────────────────────────────────────────
-- Plans (system catalog — readable for everyone bypass)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_tables      INTEGER NOT NULL,
  max_records     INTEGER NOT NULL,
  max_storage_mb  INTEGER NOT NULL,
  max_api_keys    INTEGER NOT NULL,
  max_team        INTEGER NOT NULL,
  has_backups     BOOLEAN NOT NULL DEFAULT FALSE,
  has_advanced_logs BOOLEAN NOT NULL DEFAULT FALSE,
  features        JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_read ON plans;
CREATE POLICY plans_read ON plans FOR SELECT USING (true);
DROP POLICY IF EXISTS plans_admin ON plans;
CREATE POLICY plans_admin ON plans FOR ALL
  USING (current_tenant_bypass()) WITH CHECK (current_tenant_bypass());

INSERT INTO plans (id, name, price_monthly, max_tables, max_records, max_storage_mb, max_api_keys, max_team, has_backups, has_advanced_logs, features, sort_order)
VALUES
  ('free',       'Free',       0,    8,   1000,    100,  1,  1, FALSE, FALSE,
   '["8 default tables","1,000 records","100 MB storage","1 API key","Basic logs"]'::jsonb, 1),
  ('starter',    'Starter',    29,   25,  25000,   5000, 5,  5, TRUE,  FALSE,
   '["25 tables","25,000 records","5 GB storage","5 API keys","Daily backups"]'::jsonb, 2),
  ('pro',        'Pro',        99,   100, 250000,  50000, 20, 20, TRUE, TRUE,
   '["100 tables","250,000 records","50 GB storage","20 API keys","Hourly backups","Advanced audit logs"]'::jsonb, 3),
  ('enterprise', 'Enterprise', 0,    100000, 100000000, 1000000, 1000, 1000, TRUE, TRUE,
   '["Unlimited tables","Unlimited records","Dedicated infra","SSO/SAML","SLA"]'::jsonb, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  max_tables = EXCLUDED.max_tables,
  max_records = EXCLUDED.max_records,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_api_keys = EXCLUDED.max_api_keys,
  max_team = EXCLUDED.max_team,
  has_backups = EXCLUDED.has_backups,
  has_advanced_logs = EXCLUDED.has_advanced_logs,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- ─────────────────────────────────────────────────────────────────
-- Tenants: add plan + branding columns
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique ON tenants (LOWER(slug)) WHERE slug IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- Workspaces (one per tenant by default; allows multiple later)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspaces_tenant_idx ON workspaces (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_tenant_slug ON workspaces (tenant_id, LOWER(slug));
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspaces_select ON workspaces;
CREATE POLICY workspaces_select ON workspaces FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS workspaces_mod ON workspaces;
CREATE POLICY workspaces_mod ON workspaces FOR ALL
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- Dynamic database tables (user-defined virtual tables)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS db_tables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  is_system     BOOLEAN NOT NULL DEFAULT FALSE, -- default seeded tables, harder to delete
  icon          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS db_tables_tenant_idx ON db_tables (tenant_id, workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS db_tables_tenant_name ON db_tables (tenant_id, workspace_id, LOWER(name));
ALTER TABLE db_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS db_tables_select ON db_tables;
CREATE POLICY db_tables_select ON db_tables FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS db_tables_mod ON db_tables;
CREATE POLICY db_tables_mod ON db_tables FOR ALL
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_db_tables_updated_at ON db_tables;
CREATE TRIGGER trg_db_tables_updated_at BEFORE UPDATE ON db_tables
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- Columns for dynamic tables
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS db_columns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_id    UUID NOT NULL REFERENCES db_tables(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  data_type   TEXT NOT NULL CHECK (data_type IN ('text','number','boolean','date','datetime','json','email','url')),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  default_value TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS db_columns_table_idx ON db_columns (table_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS db_columns_table_name ON db_columns (table_id, LOWER(name));
ALTER TABLE db_columns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS db_columns_select ON db_columns;
CREATE POLICY db_columns_select ON db_columns FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS db_columns_mod ON db_columns;
CREATE POLICY db_columns_mod ON db_columns FOR ALL
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- Records for dynamic tables (separate from existing `records`)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS db_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_id    UUID NOT NULL REFERENCES db_tables(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS db_records_tenant_table_idx ON db_records (tenant_id, table_id, created_at DESC);
CREATE INDEX IF NOT EXISTS db_records_data_gin ON db_records USING GIN (data);
ALTER TABLE db_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS db_records_select ON db_records;
CREATE POLICY db_records_select ON db_records FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS db_records_mod ON db_records;
CREATE POLICY db_records_mod ON db_records FOR ALL
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

DROP TRIGGER IF EXISTS trg_db_records_updated_at ON db_records;
CREATE TRIGGER trg_db_records_updated_at BEFORE UPDATE ON db_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- API keys (only the hash + a short prefix is stored)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  key_prefix    TEXT NOT NULL,            -- first 8 chars, displayed
  key_hash      TEXT NOT NULL,            -- sha256 hex of full key
  scopes        TEXT[] NOT NULL DEFAULT ARRAY['read','write']::TEXT[],
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_tenant_idx ON api_keys (tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_unique ON api_keys (key_hash);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_keys_select ON api_keys;
CREATE POLICY api_keys_select ON api_keys FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS api_keys_mod ON api_keys;
CREATE POLICY api_keys_mod ON api_keys FOR ALL
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- Backups (logical snapshots of db_records per table)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  label         TEXT NOT NULL,
  snapshot      JSONB NOT NULL,           -- {tables:[{id,name,records:[...]}]}
  size_bytes    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS backups_tenant_idx ON backups (tenant_id, created_at DESC);
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backups_select ON backups;
CREATE POLICY backups_select ON backups FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS backups_mod ON backups;
CREATE POLICY backups_mod ON backups FOR ALL
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- Team invites
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       CITEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','editor','viewer','member')),
  token       TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_invites_tenant_idx ON team_invites (tenant_id, created_at DESC);
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_invites_select ON team_invites;
CREATE POLICY team_invites_select ON team_invites FOR SELECT
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id());
DROP POLICY IF EXISTS team_invites_mod ON team_invites;
CREATE POLICY team_invites_mod ON team_invites FOR ALL
  USING (current_tenant_bypass() OR tenant_id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id());

-- Extend users.role choices to include editor/viewer (looser)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner','admin','editor','viewer','member'));

-- ─────────────────────────────────────────────────────────────────
-- Helper: provision default workspace + 8 default tables for a tenant
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION provision_tenant_defaults(_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  ws_id UUID;
  t_id UUID;
  t_name TEXT;
  cols JSONB;
  col JSONB;
  pos INTEGER;
BEGIN
  -- Create default workspace if missing
  INSERT INTO workspaces (tenant_id, name, slug, is_default)
  VALUES (_tenant_id, 'Default Workspace', 'default', TRUE)
  ON CONFLICT (tenant_id, LOWER(slug)) DO NOTHING
  RETURNING id INTO ws_id;

  IF ws_id IS NULL THEN
    SELECT id INTO ws_id FROM workspaces
    WHERE tenant_id = _tenant_id AND is_default = TRUE LIMIT 1;
  END IF;

  -- Default tables + columns
  FOR t_name, cols IN
    SELECT * FROM (VALUES
      ('customers', '[{"name":"name","type":"text","required":true},{"name":"email","type":"email"},{"name":"phone","type":"text"},{"name":"company","type":"text"},{"name":"notes","type":"text"}]'::jsonb),
      ('users',     '[{"name":"username","type":"text","required":true},{"name":"email","type":"email","required":true},{"name":"role","type":"text"},{"name":"active","type":"boolean"}]'::jsonb),
      ('orders',    '[{"name":"order_number","type":"text","required":true},{"name":"customer","type":"text"},{"name":"amount","type":"number"},{"name":"status","type":"text"},{"name":"placed_at","type":"datetime"}]'::jsonb),
      ('products',  '[{"name":"sku","type":"text","required":true},{"name":"name","type":"text","required":true},{"name":"price","type":"number"},{"name":"stock","type":"number"},{"name":"description","type":"text"}]'::jsonb),
      ('services',  '[{"name":"name","type":"text","required":true},{"name":"price","type":"number"},{"name":"duration_minutes","type":"number"},{"name":"active","type":"boolean"}]'::jsonb),
      ('files',     '[{"name":"filename","type":"text","required":true},{"name":"url","type":"url"},{"name":"size_bytes","type":"number"},{"name":"mime_type","type":"text"}]'::jsonb),
      ('logs',      '[{"name":"event","type":"text","required":true},{"name":"level","type":"text"},{"name":"message","type":"text"},{"name":"meta","type":"json"}]'::jsonb),
      ('settings',  '[{"name":"key","type":"text","required":true},{"name":"value","type":"text"},{"name":"description","type":"text"}]'::jsonb)
    ) AS v(t_name, cols)
  LOOP
    INSERT INTO db_tables (tenant_id, workspace_id, name, is_system, icon)
    VALUES (_tenant_id, ws_id, t_name, TRUE, t_name)
    ON CONFLICT (tenant_id, workspace_id, LOWER(name)) DO NOTHING
    RETURNING id INTO t_id;

    IF t_id IS NULL THEN
      SELECT id INTO t_id FROM db_tables
      WHERE tenant_id = _tenant_id AND workspace_id = ws_id AND LOWER(name) = LOWER(t_name) LIMIT 1;
      CONTINUE; -- columns already exist
    END IF;

    pos := 0;
    FOR col IN SELECT * FROM jsonb_array_elements(cols)
    LOOP
      INSERT INTO db_columns (tenant_id, table_id, name, data_type, is_required, position)
      VALUES (
        _tenant_id, t_id,
        col->>'name',
        COALESCE(col->>'type','text'),
        COALESCE((col->>'required')::boolean, FALSE),
        pos
      )
      ON CONFLICT (table_id, LOWER(name)) DO NOTHING;
      pos := pos + 1;
    END LOOP;
  END LOOP;

  RETURN ws_id;
END;
$$;

-- Backfill defaults for existing tenants
DO $$
DECLARE r RECORD;
BEGIN
  PERFORM set_config('app.tenant_bypass', 'on', true);
  FOR r IN SELECT id FROM tenants LOOP
    PERFORM provision_tenant_defaults(r.id);
  END LOOP;
END$$;
