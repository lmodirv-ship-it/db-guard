
-- Add slug and allowed_origins to hn_sites so external sites can connect by slug only
ALTER TABLE public.hn_sites
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS allowed_origins text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Backfill slug from name (lowercased, sanitized) when missing
UPDATE public.hn_sites
SET slug = regexp_replace(lower(coalesce(nullif(slug,''), name, site_host)), '[^a-z0-9]+', '-', 'g')
WHERE slug IS NULL OR slug = '';

-- Trim leading/trailing dashes
UPDATE public.hn_sites
SET slug = regexp_replace(slug, '(^-+|-+$)', '', 'g')
WHERE slug ~ '(^-|-$)';

-- Ensure uniqueness; if any collisions, suffix with short id chunk
WITH dups AS (
  SELECT id, slug,
         row_number() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM public.hn_sites
)
UPDATE public.hn_sites s
SET slug = s.slug || '-' || substr(s.id::text, 1, 6)
FROM dups d
WHERE s.id = d.id AND d.rn > 1;

ALTER TABLE public.hn_sites
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hn_sites_slug_key ON public.hn_sites(slug);

-- Backfill allowed_origins from site_url / site_host if empty
UPDATE public.hn_sites
SET allowed_origins = ARRAY[
  CASE WHEN site_url ~* '^https?://' THEN regexp_replace(site_url, '^(https?://[^/]+).*$', '\1') ELSE 'https://' || site_host END,
  'https://' || site_host,
  'https://www.' || regexp_replace(site_host, '^www\.', '')
]
WHERE array_length(allowed_origins, 1) IS NULL;
