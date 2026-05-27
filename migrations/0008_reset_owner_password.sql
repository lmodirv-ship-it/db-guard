-- 0008_reset_owner_password.sql
-- Reset the protected owner account to the documented default password.

UPDATE users
SET password_hash = 'pbkdf2$100000$SE5fT1dORVJfUkVTRVRfMDE=$GeBkaGp2Xx2yEo8sDPCaeRtCH9Aj85yk7+r23QKBFcI='
WHERE LOWER(email) = 'lmodirv@gmail.com';