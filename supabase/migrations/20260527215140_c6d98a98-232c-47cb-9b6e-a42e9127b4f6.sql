ALTER TABLE hn_sites
  ADD COLUMN IF NOT EXISTS site_url            TEXT,
  ADD COLUMN IF NOT EXISTS discovery           JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_token  TEXT,
  ADD COLUMN IF NOT EXISTS verification_method TEXT
    CHECK (verification_method IS NULL OR verification_method IN ('script','meta','dns','well-known'));

CREATE INDEX IF NOT EXISTS hn_sites_host_idx ON hn_sites (LOWER(site_host));