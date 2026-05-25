/**
 * Plan limit enforcement helper.
 * Reads the tenant's current plan + counts and throws if a limit is hit.
 */
import { withTenant } from "@/lib/db/tenant.server";

export type PlanRow = {
  id: string;
  name: string;
  max_tables: number;
  max_records: number;
  max_storage_mb: number;
  max_api_keys: number;
  max_team: number;
  has_backups: boolean;
  has_advanced_logs: boolean;
};

export type UsageRow = {
  tables: number;
  records: number;
  api_keys: number;
  team: number;
};

export async function getTenantPlan(tenantId: string): Promise<PlanRow> {
  const rows = await withTenant<PlanRow>(tenantId, (sql) => sql`
    SELECT p.id, p.name, p.max_tables, p.max_records, p.max_storage_mb,
           p.max_api_keys, p.max_team, p.has_backups, p.has_advanced_logs
    FROM tenants t JOIN plans p ON p.id = t.plan_id
    WHERE t.id = ${tenantId} LIMIT 1
  `);
  if (!rows[0]) throw new Error("plan_not_found");
  return rows[0];
}

export async function getTenantUsage(tenantId: string): Promise<UsageRow> {
  const rows = await withTenant<UsageRow>(tenantId, (sql) => sql`
    SELECT
      (SELECT count(*)::int FROM db_tables  WHERE tenant_id = ${tenantId}) AS tables,
      (SELECT count(*)::int FROM db_records WHERE tenant_id = ${tenantId}) AS records,
      (SELECT count(*)::int FROM api_keys   WHERE tenant_id = ${tenantId} AND revoked_at IS NULL) AS api_keys,
      (SELECT count(*)::int FROM users      WHERE tenant_id = ${tenantId}) AS team
  `);
  return rows[0] ?? { tables: 0, records: 0, api_keys: 0, team: 0 };
}

export class PlanLimitError extends Error {
  constructor(public limit: string, public current: number, public max: number) {
    super(`plan_limit_${limit}`);
  }
}
