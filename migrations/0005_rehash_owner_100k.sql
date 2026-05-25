-- 0005_rehash_owner_100k.sql
-- Cloudflare Workers caps PBKDF2 iterations at 100k. The original seed used
-- 600k which fails verification at runtime. Reset the protected owner's hash
-- to a 100k-iteration hash of the same default password (admin@1234).
-- Other users (if any) must reset their password via the change-password flow.

UPDATE users
SET password_hash = 'pbkdf2$100000$MvLLbDm5AXAdEnIhowg7Fg==$SIehRcmeSPSZth6d5xbKF8Z2bJnZFiTTHeKfd9rhtVE='
WHERE LOWER(email) = 'lmodirv@gmail.com';
