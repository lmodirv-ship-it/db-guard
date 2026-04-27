/**
 * Tenant-scoped DB helper.
 *
 * Strategy (dual isolation):
 *   1. App layer  — every query takes a `tenantId` and includes a
 *                   `WHERE tenant_id = $tid` clause explicitly.
 *   2. RLS layer  — every query is wrapped in a Neon HTTP transaction
 *                   that begins with `SET LOCAL app.tenant_id = '<tid>'`,
 *                   so Postgres RLS policies enforce the same predicate.
 *
 * Both layers must agree. If a developer forgets the WHERE clause, RLS
 * still blocks cross-tenant rows. If RLS is somehow disabled, the
 * application WHERE clause still blocks them.
 */
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "../env.server";

// Loose alias — the Neon HTTP driver's generics are too strict to mix with
// generic helpers; we accept any pre-built query promise.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let _sql: ReturnType<typeof neon> | null = null;
function getNeon() {
  if (_sql) return _sql;
  _sql = neon(requireEnv().HN_DB_URL);
  return _sql;
}

function assertUuid(v: string, label: string): string {
  if (!UUID_RE.test(v)) throw new Error(`${label}_invalid_uuid`);
  return v;
}

/**
 * Run a single tenant-scoped query inside an HTTP transaction with
 * `SET LOCAL app.tenant_id = '<tid>'` applied first.
 *
 * `build(sql)` receives the in-transaction sql tag and must return a single
 * query promise. Returns the query rows.
 */
export async function withTenant<T = Record<string, unknown>>(
  tenantId: string,
  build: (sql: ReturnType<typeof neon>) => AnyQuery,
): Promise<T[]> {
  const tid = assertUuid(tenantId, "tenantId");
  const sql = getNeon();
  const setStmt = sql`SELECT set_config('app.tenant_id', ${tid}, true)`;
  const userStmt = build(sql);
  const results = (await sql.transaction([setStmt, userStmt] as AnyQuery)) as unknown as Array<
    Array<Record<string, unknown>>
  >;
  return (results[1] ?? []) as T[];
}

/**
 * Run an "admin / bypass" block — used by signup (no tenant yet),
 * the migration runner, and trusted system jobs. Sets app.tenant_bypass = on
 * for the duration of the transaction.
 */
export async function withBypass<T = Record<string, unknown>>(
  build: (sql: ReturnType<typeof neon>) => NeonQueryPromise<false, false>,
): Promise<T[]> {
  const sql = getNeon();
  const setStmt = sql`SELECT set_config('app.tenant_bypass', 'on', true)`;
  const userStmt = build(sql);
  const results = (await sql.transaction([setStmt, userStmt])) as unknown as Array<
    Array<Record<string, unknown>>
  >;
  return (results[1] ?? []) as T[];
}

/**
 * Assert that a row's tenant_id matches the expected one. Use after fetching
 * by primary key to make cross-tenant access an explicit 403 instead of a
 * silent "not found".
 */
export function assertTenantOwned<R extends { tenant_id: string }>(
  row: R | undefined,
  expectedTenantId: string,
): R {
  if (!row) throw new TenantAccessError(404, "not_found");
  if (row.tenant_id !== expectedTenantId) {
    throw new TenantAccessError(403, "forbidden");
  }
  return row;
}

export class TenantAccessError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}
