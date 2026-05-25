CREATE SEQUENCE IF NOT EXISTS public.hn_user_code_seq START WITH 10001 INCREMENT BY 1;

SELECT setval(
  'public.hn_user_code_seq',
  GREATEST(
    10000,
    COALESCE((
      SELECT MAX((substring(hn_user_code FROM '^HN-?(\d+)$'))::bigint)
      FROM public.hn_users
      WHERE hn_user_code ~ '^HN-?\d+$'
    ), 10000)
  ),
  true
);

CREATE OR REPLACE FUNCTION public.generate_hn_user_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  candidate text;
  i int := 0;
BEGIN
  LOOP
    candidate := 'HN' || nextval('public.hn_user_code_seq')::text;
    IF NOT EXISTS (SELECT 1 FROM public.hn_users WHERE hn_user_code = candidate) THEN
      RETURN candidate;
    END IF;
    i := i + 1;
    IF i > 50 THEN
      RAISE EXCEPTION 'Could not generate unique hn_user_code';
    END IF;
  END LOOP;
END;
$function$;