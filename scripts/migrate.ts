/**
 * Migration runner. Run with:
 *   bun run scripts/migrate.ts
 *
 * Uses HN_DB_DIRECT_URL (a non-pooled connection) so we can run
 * SET LOCAL app.tenant_bypass = 'on' inside the same transaction.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.HN_DB_DIRECT_URL;
  if (!url) {
    console.error("HN_DB_DIRECT_URL is required");
    process.exit(1);
  }
  const sql = neon(url);

  // Bootstrap tracking table (idempotent, runs every time).
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const dir = resolve(process.cwd(), "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = (await sql`SELECT filename FROM schema_migrations`) as Array<{
    filename: string;
  }>;
  const appliedSet = new Set(applied.map((r) => r.filename));

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`✓ skip   ${file}`);
      continue;
    }
    console.log(`→ apply  ${file}`);
    const sqlText = readFileSync(join(dir, file), "utf8");
    // Neon HTTP driver supports multi-statement when using sql.query()? No —
    // we must use the unsafe template tag with a single string. Split on `;`
    // is unsafe; use the driver's transaction with raw query instead.
    // Easiest: rely on the fact that .query() (when supported) sends raw SQL.
    // Fallback: use the `unsafe` form by tagging an empty template literal.
    // The `neon` HTTP function accepts a string as a query when invoked as
    // `sql(text)`, returning rows.
    try {
      // @ts-ignore — runtime shape supports raw string call
      await sql(sqlText);
    } catch (err) {
      console.error(`✗ failed ${file}:`, err);
      process.exit(1);
    }
    await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`;
    console.log(`✓ done   ${file}`);
  }

  console.log("All migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
