/**
 * HN Auth — current user, identified by HN bearer token.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireHnAccess, hnAccessErrorResponse } from "@/lib/hn/access.server";
import { listUserRoles, listUserPermissions } from "@/lib/hn/permissions.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-HN-Token, X-HN-Site",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

export const Route = createFileRoute("/api/hn/auth/me")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const ctx = await requireHnAccess(request);
          const [roles, perms] = await Promise.all([
            listUserRoles(ctx.userId, ctx.tenantId),
            listUserPermissions(ctx.userId, ctx.tenantId),
          ]);
          return json(200, {
            ok: true,
            user: { id: ctx.userId, email: ctx.email, tenant_id: ctx.tenantId },
            roles, permissions: perms,
            session: { id: ctx.sessionId, source_app: ctx.sourceApp },
          });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },
    },
  },
});
