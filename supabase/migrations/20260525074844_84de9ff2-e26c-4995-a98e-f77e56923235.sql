SELECT setval(
  'public.hn_user_code_seq',
  GREATEST(
    10000,
    COALESCE((
      SELECT MAX((substring(hn_user_code FROM '^HN(\d+)$'))::bigint)
      FROM public.hn_users
      WHERE hn_user_code ~ '^HN\d+$'
    ), 10000)
  ),
  true
);