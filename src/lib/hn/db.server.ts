/**
 * HN.db — collection-based JSON document storage.
 * A "collection" maps 1:1 to a `db_tables` row (auto-created on first write)
 * inside the tenant's default workspace.
 */
import { withTenant } from "@/lib/db/tenant.server";

const SLUG_RE = /^[a-z][a-z0-9_-]{0,62}$/;

export function isCollectionName(s: string): boolean {
  return SLUG_RE.test(s);
}

export async function getOrCreateCollection(
  tenantId: string,
  name: string,
): Promise<{ id: string; name: string; workspace_id: string }> {
  const lc = name.toLowerCase();
  const existing = await withTenant<{ id: string; name: string; workspace_id: string }>(
    tenantId,
    (sql) => sql`
      SELECT id, name, workspace_id FROM db_tables
      WHERE tenant_id = ${tenantId} AND LOWER(name) = ${lc}
      LIMIT 1
    `,
  );
  if (existing.length) return existing[0];

  const ws = await withTenant<{ id: string }>(tenantId, (sql) => sql`
    SELECT id FROM workspaces WHERE tenant_id = ${tenantId}
    ORDER BY is_default DESC, created_at ASC LIMIT 1
  `);
  if (!ws.length) {
    const created = await withTenant<{ id: string }>(tenantId, (sql) => sql`
      INSERT INTO workspaces (tenant_id, name, slug, is_default)
      VALUES (${tenantId}, 'Default', 'default', TRUE)
      RETURNING id
    `);
    ws.push(created[0]);
  }

  const rows = await withTenant<{ id: string; name: string; workspace_id: string }>(
    tenantId,
    (sql) => sql`
      INSERT INTO db_tables (tenant_id, workspace_id, name, description)
      VALUES (${tenantId}, ${ws[0].id}, ${lc}, 'Auto-created via HN.db')
      RETURNING id, name, workspace_id
    `,
  );
  return rows[0];
}

export type DbRecord = {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function listRecords(
  tenantId: string,
  tableId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<DbRecord[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);
  return withTenant<DbRecord>(tenantId, (sql) => sql`
    SELECT id, data, created_at, updated_at FROM db_records
    WHERE tenant_id = ${tenantId} AND table_id = ${tableId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function insertRecord(
  tenantId: string, tableId: string, data: Record<string, unknown>,
): Promise<DbRecord> {
  const rows = await withTenant<DbRecord>(tenantId, (sql) => sql`
    INSERT INTO db_records (tenant_id, table_id, data)
    VALUES (${tenantId}, ${tableId}, ${JSON.stringify(data)}::jsonb)
    RETURNING id, data, created_at, updated_at
  `);
  return rows[0];
}

export async function updateRecord(
  tenantId: string, tableId: string, id: string, data: Record<string, unknown>,
): Promise<DbRecord | null> {
  const rows = await withTenant<DbRecord>(tenantId, (sql) => sql`
    UPDATE db_records
    SET data = data || ${JSON.stringify(data)}::jsonb
    WHERE tenant_id = ${tenantId} AND table_id = ${tableId} AND id = ${id}
    RETURNING id, data, created_at, updated_at
  `);
  return rows[0] ?? null;
}

export async function deleteRecord(
  tenantId: string, tableId: string, id: string,
): Promise<boolean> {
  const rows = await withTenant<{ id: string }>(tenantId, (sql) => sql`
    DELETE FROM db_records
    WHERE tenant_id = ${tenantId} AND table_id = ${tableId} AND id = ${id}
    RETURNING id
  `);
  return rows.length > 0;
}
