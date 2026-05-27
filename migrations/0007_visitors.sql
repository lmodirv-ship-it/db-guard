-- 0007_visitors.sql
-- Visitors log: every signup is recorded with an auto-increment ID
-- so the owner can browse registrations from the dashboard.

CREATE TABLE IF NOT EXISTS visitors (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  name          TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  referer       TEXT,
  country       TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visitors_registered_idx ON visitors (registered_at DESC);
CREATE INDEX IF NOT EXISTS visitors_email_idx ON visitors (LOWER(email));
