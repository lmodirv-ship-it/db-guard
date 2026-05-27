
ALTER TABLE public.hn_sites
  ALTER COLUMN slug SET DEFAULT ('site-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
