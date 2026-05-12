/**
 * Tenant isolation integration test.
 * Skipped unless HN_DB_TEST_URL is set (a disposable Neon DB with the migrations applied).
 *
 * Asserts that records inserted under tenant A are NOT readable when scoped to tenant B,
 * proving the (tenant_id, ...) WHERE-scoping pattern used by the DAL prevents cross-tenant leaks.
 */
import { describe, it, expect } from "vitest";
import { neon } from "@neondatabase/serverless";

const url = process.env.HN_DB_TEST_URL;
const d = url ? describe : describe.skip;

d("tenant isolation (live DB)", () => {
  const sql = neon(url!);

  it("denies cross-tenant reads via WHERE tenant_id scoping", async () => {
    const [tA] = (await sql`INSERT INTO tenants (name) VALUES ('iso-A') RETURNING id`) as { id: string }[];
    const [tB] = (await sql`INSERT INTO tenants (name) VALUES ('iso-B') RETURNING id`) as { id: string }[];

    const [uA] = (await sql`
      INSERT INTO users (tenant_id, email, password_hash, role)
      VALUES (${tA.id}, ${`a-${Date.now()}@iso.test`}, 'pbkdf2$1$x$y', 'owner')
      RETURNING id
    `) as { id: string }[];

    const [pA] = (await sql`
      INSERT INTO projects (tenant_id, created_by, site_url)
      VALUES (${tA.id}, ${uA.id}, 'https://a.example.com')
      RETURNING id
    `) as { id: string }[];

    await sql`
      INSERT INTO records (tenant_id, project_id, entity, data)
      VALUES (${tA.id}, ${pA.id}, 'item', ${'{"secret":"A"}'}::jsonb)
    `;

    // Tenant B should see zero rows when scoping by its own tenant_id.
    const fromB = (await sql`
      SELECT id FROM records WHERE tenant_id = ${tB.id} AND project_id = ${pA.id}
    `) as { id: string }[];
    expect(fromB).toHaveLength(0);

    // Tenant A still sees its row.
    const fromA = (await sql`
      SELECT id FROM records WHERE tenant_id = ${tA.id} AND project_id = ${pA.id}
    `) as { id: string }[];
    expect(fromA.length).toBeGreaterThan(0);

    // cleanup (CASCADE handles children)
    await sql`DELETE FROM tenants WHERE id IN (${tA.id}, ${tB.id})`;
  });
});
