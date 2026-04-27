-- 0001_init.sql
-- Smart Project Generator — initial multi-tenant schema.
-- Every business table carries tenant_id NOT NULL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────
-- Tenants
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- Users (each user belongs to exactly one tenant)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         CITEXT,                                -- if citext available
  password_hash TEXT NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'owner'
                CHECK (role IN ('owner','admin','member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- citext may not exist in all Neon plans; fall back to TEXT + lower() index.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'citext'
  ) THEN
    BEGIN
      CREATE EXTENSION citext;
    EXCEPTION WHEN OTHERS THEN
      ALTER TABLE users ALTER COLUMN email TYPE TEXT;
    END;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_tenant_idx ON users (tenant_id);

-- ─────────────────────────────────────────────────────────────────
-- Projects (one row per generated project)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  site_url            TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN (
                         'pending','verifying','verified',
                         'analyzing','generating_schema','importing',
                         'completed','failed'
                       )),
  verification_method TEXT
                       CHECK (verification_method IS NULL OR verification_method IN
                              ('well_known','dns_txt','meta_tag')),
  verification_token  TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  verified_at         TIMESTAMPTZ,
  schema_json         JSONB,
  stats_json          JSONB,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_tenant_idx
  ON projects (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_tenant_status_idx
  ON projects (tenant_id, status);

-- ─────────────────────────────────────────────────────────────────
-- Records (the imported entities — generic JSONB store)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity      TEXT NOT NULL,
  external_id TEXT,                                  -- for dedup / incremental sync
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS records_tenant_project_idx
  ON records (tenant_id, project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS records_tenant_entity_idx
  ON records (tenant_id, project_id, entity);
CREATE UNIQUE INDEX IF NOT EXISTS records_dedup_unique
  ON records (tenant_id, project_id, entity, external_id)
  WHERE external_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- Jobs (durable queue mirror; Cloudflare Queues is the transport)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL
                   CHECK (kind IN ('verify','analyze','generate_schema','import','full_pipeline')),
  status          TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued','running','succeeded','failed','dead_letter')),
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  last_error      TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_tenant_idx
  ON jobs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_status_idx
  ON jobs (status, scheduled_at);

-- ─────────────────────────────────────────────────────────────────
-- Project files (metadata for objects stored in R2)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,                         -- always starts with t/<tenant>/p/<project>/
  kind        TEXT NOT NULL,                         -- e.g. 'raw_html','schema_json','export_csv'
  size_bytes  BIGINT,
  mime_type   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_files_tenant_project_idx
  ON project_files (tenant_id, project_id, created_at DESC);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_records_updated_at ON records;
CREATE TRIGGER trg_records_updated_at BEFORE UPDATE ON records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
