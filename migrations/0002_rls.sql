-- 0002_rls.sql
-- Layer 2 of dual isolation: Postgres Row-Level Security.
-- Application layer always passes tenant_id WHERE clauses (Layer 1).
-- RLS enforces tenant_id = current_setting('app.tenant_id') as a safety net.
--
-- Connection model: Neon HTTP driver opens a fresh transaction per request.
-- Every request must do:
--   SET LOCAL app.tenant_id = '<tenant from JWT>';
-- Without that, RLS denies all rows.

-- Use a non-superuser app role (we keep using the connection role here for
-- simplicity; if Neon plan provides a separate role, switch to it).

ALTER TABLE tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Helper: returns the configured tenant id, or NULL if not set.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v TEXT;
BEGIN
  v := current_setting('app.tenant_id', true);
  IF v IS NULL OR v = '' THEN RETURN NULL; END IF;
  RETURN v::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;

-- A bypass flag for trusted boot/admin contexts (signup before tenant exists,
-- migration runner, system jobs). Default off.
CREATE OR REPLACE FUNCTION current_tenant_bypass() RETURNS BOOLEAN
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN coalesce(current_setting('app.tenant_bypass', true), 'off') = 'on';
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- tenants: a user can only see their own tenant row
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tenants_select ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (current_tenant_bypass() OR id = current_tenant_id());

DROP POLICY IF EXISTS tenants_mod ON tenants;
CREATE POLICY tenants_mod ON tenants FOR ALL
  USING      (current_tenant_bypass() OR id = current_tenant_id())
  WITH CHECK (current_tenant_bypass() OR id = current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- Generic tenant_id-scoped policies for the rest
-- ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','projects','records','jobs','project_files'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
    EXECUTE format($f$
      CREATE POLICY %I_select ON %I FOR SELECT
        USING (current_tenant_bypass() OR tenant_id = current_tenant_id())
    $f$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_mod ON %I', t, t);
    EXECUTE format($f$
      CREATE POLICY %I_mod ON %I FOR ALL
        USING      (current_tenant_bypass() OR tenant_id = current_tenant_id())
        WITH CHECK (current_tenant_bypass() OR tenant_id = current_tenant_id())
    $f$, t, t);
  END LOOP;
END$$;

-- ─────────────────────────────────────────────────────────────────
-- Migration tracking table (no RLS — needs to always be readable)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename    TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
