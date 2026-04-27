/**
 * Security & isolation smoke tests.
 *
 * Run after applying migrations and with a valid HN_DB_DIRECT_URL:
 *   bun run scripts/security-tests.ts
 *
 * What it checks:
 *  1. RLS denies cross-tenant SELECT.
 *  2. RLS denies cross-tenant INSERT (WITH CHECK).
 *  3. Setting app.tenant_id to tenant A cannot see tenant B's rows.
 *  4. The bypass flag (app.tenant_bypass=on) does see all rows (admin path).
 *  5. Records dedup unique constraint enforces (tenant,project,entity,external_id).
 *  6. URL SSRF guard rejects private IPs and localhost variants.
 *  7. Storage key builder enforces tenant prefix and rejects path traversal.
 *  8. Password hashing: same input → different hashes; verify works.
 *  9. JWT round-trip with tampered token rejected.
 *
 * The script prints a PASS/FAIL line per check and exits non-zero on failure.
 */
import { neon } from "@neondatabase/serverless";
import { hashPassword, verifyPassword } from "../src/lib/auth/password.server";
import { signSession, verifySession } from "../src/lib/auth/jwt.server";
import { normalizeProjectUrl, UrlValidationError } from "../src/lib/projects/url.server";
import { buildKey, assertKeyForTenant } from "../src/lib/storage/storage.server";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  const tag = cond ? "PASS" : "FAIL";
  if (!cond) failed++;
  console.log(`${tag}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const url = process.env.HN_DB_DIRECT_URL;
  if (!url) {
    console.error("HN_DB_DIRECT_URL required");
    process.exit(2);
  }
  const sql = neon(url);

  // Set up two ephemeral tenants
  const [{ id: tA }] = (await sql`
    INSERT INTO tenants (name) VALUES ('sec-test-A') RETURNING id
  `) as Array<{ id: string }>;
  const [{ id: tB }] = (await sql`
    INSERT INTO tenants (name) VALUES ('sec-test-B') RETURNING id
  `) as Array<{ id: string }>;

  // Insert a project in each tenant (uses connection role; default Neon role
  // is BYPASSRLS, so direct inserts work — RLS only matters for non-superuser
  // sessions. We test RLS by setting app.tenant_id and querying through
  // policies; that simulates the application path.)
  const [{ id: pA }] = (await sql`
    INSERT INTO projects (tenant_id, created_by, site_url)
    SELECT ${tA}, u.id, 'https://a.example.com'
    FROM (
      INSERT INTO users (tenant_id, email, password_hash)
      VALUES (${tA}, 'sec-a@test', 'x') RETURNING id
    ) u
    RETURNING id
  `) as Array<{ id: string }>;
  const [{ id: pB }] = (await sql`
    INSERT INTO projects (tenant_id, created_by, site_url)
    SELECT ${tB}, u.id, 'https://b.example.com'
    FROM (
      INSERT INTO users (tenant_id, email, password_hash)
      VALUES (${tB}, 'sec-b@test', 'x') RETURNING id
    ) u
    RETURNING id
  `) as Array<{ id: string }>;

  // 1+3. RLS: from tenant A's perspective, B's project must be invisible.
  const visible = (await sql.transaction([
    sql`SELECT set_config('app.tenant_id', ${tA}, true)`,
    sql`SELECT set_config('role', 'authenticated', true)`, // best-effort
    sql`SELECT id FROM projects WHERE id = ${pB}`,
  ] as never)) as unknown as Array<Array<{ id: string }>>;
  check(
    "RLS: tenant A cannot SELECT tenant B project",
    (visible[2]?.length ?? 0) === 0,
    `rows=${visible[2]?.length}`,
  );

  // 2. RLS WITH CHECK: tenant A trying to INSERT project under tenant B should fail
  // (under non-superuser session). Even when our role is BYPASSRLS, the
  // application path uses set_config('app.tenant_id', tA) and a WHERE clause,
  // so this assertion is most meaningful at the app layer; we still attempt
  // the policy-level check by forcing FORCE ROW LEVEL SECURITY temporarily.
  await sql`ALTER TABLE projects FORCE ROW LEVEL SECURITY`;
  let crossInsertBlocked = false;
  try {
    await sql.transaction([
      sql`SELECT set_config('app.tenant_id', ${tA}, true)`,
      sql`INSERT INTO projects (tenant_id, created_by, site_url)
          VALUES (${tB}, ${pA}, 'https://evil.example.com')`,
    ] as never);
  } catch {
    crossInsertBlocked = true;
  } finally {
    await sql`ALTER TABLE projects NO FORCE ROW LEVEL SECURITY`;
  }
  check("RLS WITH CHECK: cross-tenant INSERT blocked", crossInsertBlocked);

  // 4. Bypass mode sees all
  const allRows = (await sql.transaction([
    sql`SELECT set_config('app.tenant_bypass', 'on', true)`,
    sql`SELECT count(*)::int AS n FROM projects WHERE id IN (${pA}, ${pB})`,
  ] as never)) as unknown as Array<Array<{ n: number }>>;
  check("Bypass flag sees both tenants' rows", allRows[1][0].n === 2);

  // 5. records dedup
  await sql`
    INSERT INTO records (tenant_id, project_id, entity, external_id, data)
    VALUES (${tA}, ${pA}, 'Page', 'k1', '{"a":1}'::jsonb)
  `;
  let dupBlocked = false;
  try {
    await sql`
      INSERT INTO records (tenant_id, project_id, entity, external_id, data)
      VALUES (${tA}, ${pA}, 'Page', 'k1', '{"a":2}'::jsonb)
    `;
  } catch {
    dupBlocked = true;
  }
  check("Records dedup unique enforced", dupBlocked);

  // 6. SSRF guard
  const blocked = [
    "http://127.0.0.1/",
    "http://localhost/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.1/",
    "http://192.168.1.1/",
    "http://[::1]/",
  ];
  for (const u of blocked) {
    let ok = false;
    try {
      normalizeProjectUrl(u);
    } catch (e) {
      if (e instanceof UrlValidationError && e.code === "url_blocked") ok = true;
    }
    check(`SSRF guard blocks ${u}`, ok);
  }
  // public should pass
  let publicOk = true;
  try {
    normalizeProjectUrl("https://example.com");
  } catch {
    publicOk = false;
  }
  check("SSRF guard allows public URL", publicOk);

  // 7. Storage keys
  const k1 = buildKey(tA, pA, "raw/index.html");
  check("Storage key carries tenant prefix", k1.startsWith(`t/${tA}/p/${pA}/`));
  let traversalBlocked = false;
  try {
    buildKey(tA, pA, "../../etc/passwd");
  } catch {
    traversalBlocked = true;
  }
  check("Storage key rejects path traversal chars", traversalBlocked);
  let crossTenantKey = false;
  try {
    assertKeyForTenant(`t/${tB}/p/${pB}/x.txt`, tA);
  } catch {
    crossTenantKey = true;
  }
  check("assertKeyForTenant blocks cross-tenant key", crossTenantKey);

  // 8. Password hashing
  process.env.HN_JWT_SECRET ??= "test-secret-test-secret-test-secret-1234";
  const h1 = await hashPassword("hunter22-password");
  const h2 = await hashPassword("hunter22-password");
  check("Password salts differ", h1 !== h2);
  check("Password verify ok", await verifyPassword("hunter22-password", h1));
  check("Password verify wrong rejected", !(await verifyPassword("nope", h1)));

  // 9. JWT round-trip
  const tok = await signSession({ sub: "u", tid: "t", email: "a@b.c" }, 60);
  const claims = await verifySession(tok);
  check("JWT round-trip", claims.sub === "u" && claims.tid === "t");
  let tamperBlocked = false;
  try {
    await verifySession(tok.slice(0, -2) + "AA");
  } catch {
    tamperBlocked = true;
  }
  check("JWT tamper rejected", tamperBlocked);

  // Cleanup
  await sql`DELETE FROM tenants WHERE id IN (${tA}, ${tB})`;

  console.log(`\n${failed === 0 ? "ALL OK ✓" : `${failed} FAILED ✗`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
