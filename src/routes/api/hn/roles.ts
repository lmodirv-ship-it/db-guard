/**
 * HN Roles — list roles + their permissions for the authed tenant.
 *   GET /api/hn/roles
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireHnAccess, hnAccessErrorResponse } from "@/lib/hn/access.server";
import { withBypass } from "@/lib/db/tenant.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-HN-Token",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

export const Route = createFileRoute("/api/hn/roles")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const ctx = await requireHnAccess(request, "site.read");
          const roles = await withBypass<{
            id: string; slug: string; name: string; is_system: boolean;
            tenant_id: string | null; description: string;
          }>((sql) => sql`
            SELECT id, slug, name, is_system, tenant_id, description
            FROM hn_roles
            WHERE tenant_id IS NULL OR tenant_id = ${ctx.tenantId}
            ORDER BY is_system DESC, slug ASC
          `);
          const perms = await withBypass<{ role_id: string; permission_code: string }>((sql) => sql`
            SELECT role_id, permission_code FROM hn_role_permissions
            WHERE role_id = ANY(${roles.map(r => r.id)}::uuid[])
          `);
          const map: Record<string, string[]> = {};
          for (const p of perms) (map[p.role_id] ??= []).push(p.permission_code);
          return json(200, {
            ok: true,
            roles: roles.map(r => ({ ...r, permissions: map[r.id] ?? [] })),
          });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },
    },
  },
});
