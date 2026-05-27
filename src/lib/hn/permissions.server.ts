/**
 * HN Permissions — RBAC check backed by hn_user_roles + hn_role_permissions.
 * Pure server-side. No Supabase.
 */
import { withBypass } from "@/lib/db/tenant.server";

export type PermissionCode =
  | "db.read" | "db.write" | "db.delete" | "db.admin"
  | "storage.read" | "storage.upload" | "storage.delete"
  | "auth.users.read" | "auth.users.write"
  | "site.read" | "site.write"
  | "admin.all";

/**
 * Returns true if the user has the permission in the given tenant.
 * `admin.all` grants every permission.
 */
export async function userHasPermission(
  userId: string,
  tenantId: string,
  perm: PermissionCode,
): Promise<boolean> {
  const rows = await withBypass<{ ok: boolean }>((sql) => sql`
    SELECT EXISTS (
      SELECT 1
      FROM hn_user_roles ur
      JOIN hn_role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id   = ${userId}
        AND ur.tenant_id = ${tenantId}
        AND (rp.permission_code = ${perm} OR rp.permission_code = 'admin.all')
    ) AS ok
  `);
  return Boolean(rows[0]?.ok);
}

/**
 * Returns the full permission set for a user inside a tenant.
 * Useful for tokens, debugging, or client-side menu rendering.
 */
export async function listUserPermissions(
  userId: string,
  tenantId: string,
): Promise<PermissionCode[]> {
  const rows = await withBypass<{ permission_code: PermissionCode }>((sql) => sql`
    SELECT DISTINCT rp.permission_code
    FROM hn_user_roles ur
    JOIN hn_role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = ${userId} AND ur.tenant_id = ${tenantId}
  `);
  return rows.map((r) => r.permission_code);
}

/**
 * Returns the list of role slugs the user holds in this tenant.
 */
export async function listUserRoles(
  userId: string,
  tenantId: string,
): Promise<string[]> {
  const rows = await withBypass<{ slug: string }>((sql) => sql`
    SELECT r.slug
    FROM hn_user_roles ur
    JOIN hn_roles r ON r.id = ur.role_id
    WHERE ur.user_id = ${userId} AND ur.tenant_id = ${tenantId}
  `);
  return rows.map((r) => r.slug);
}

export class PermissionDeniedError extends Error {
  constructor(public perm: PermissionCode) {
    super(`permission_denied:${perm}`);
  }
}

export async function assertPermission(
  userId: string,
  tenantId: string,
  perm: PermissionCode,
): Promise<void> {
  const ok = await userHasPermission(userId, tenantId, perm);
  if (!ok) throw new PermissionDeniedError(perm);
}
