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
    candidate := 'HN' || lpad(nextval('public.hn_user_code_seq')::text, 6, '0');
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

REVOKE ALL ON FUNCTION public.generate_hn_user_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_hn_user_code() FROM anon;
REVOKE ALL ON FUNCTION public.generate_hn_user_code() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.generate_hn_user_code() TO service_role;