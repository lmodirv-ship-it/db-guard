-- 0003_seed_owner.sql
-- Idempotent seed: ensures owner account LMODIRV@GMAIL.COM exists.
-- Default password: admin@1234 (PBKDF2-SHA256, 600k iterations).
-- The owner can change it from the dashboard at any time.

DO $$
DECLARE
  v_email   TEXT := 'lmodirv@gmail.com';
  v_hash    TEXT := 'pbkdf2$600000$VX+x7/dKZiEwUGDWCScd/Q==$Axm27aLkVMgjrXh7mQl6A3Vh8/JhsowCWnQ7SgOl0JM=';
  v_tenant  UUID;
  v_user    UUID;
BEGIN
  SELECT id, tenant_id INTO v_user, v_tenant
  FROM users WHERE LOWER(email) = v_email LIMIT 1;

  IF v_user IS NULL THEN
    INSERT INTO tenants (name) VALUES ('LMODIRV') RETURNING id INTO v_tenant;
    INSERT INTO users (tenant_id, email, password_hash, name, role)
      VALUES (v_tenant, v_email, v_hash, 'Site Owner', 'owner');
  END IF;
END$$;
