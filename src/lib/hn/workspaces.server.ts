/**
 * Workspace bootstrapping for HN tenants.
 *
 * Ensures every tenant always has at least one (default) workspace before
 * we attempt to create a site, API key, or storage object. Never blocks
 * the user with "no_workspace" — auto-creates instead.
 */
import { withTenant } from "@/lib/db/tenant.server";

export type EnsuredWorkspace = {
  id: string;
  name: string;
  slug: string;
  created: boolean;
};

/**
 * Find or create the default workspace for a tenant.
 * Idempotent — safe to call on every request.
 */
export async function ensureOwnerWorkspace(tenantId: string): Promise<EnsuredWorkspace> {
  // 1) Try existing default / oldest workspace.
  const existing = await withTenant<{ id: string; name: string; slug: string }>(
    tenantId,
    (sql) => sql`
      SELECT id, name, slug
      FROM workspaces
      WHERE tenant_id = ${tenantId}
      ORDER BY is_default DESC NULLS LAST, created_at ASC
      LIMIT 1
    `,
  );
  if (existing.length) {
    const w = existing[0];
    return { id: w.id, name: w.name, slug: w.slug, created: false };
  }

  // 2) Create a default workspace for this tenant.
  const slug = "default";
  const created = await withTenant<{ id: string; name: string; slug: string }>(
    tenantId,
    (sql) => sql`
      INSERT INTO workspaces (tenant_id, name, slug, is_default)
      VALUES (${tenantId}, 'Owner Master Workspace', ${slug}, TRUE)
      ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, slug
    `,
  );
  const w = created[0];
  return { id: w.id, name: w.name, slug: w.slug, created: true };
}
