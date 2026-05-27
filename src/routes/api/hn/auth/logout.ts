/**
 * HN Auth — revoke the current bearer session.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireHnAccess, hnAccessErrorResponse } from "@/lib/hn/access.server";
import { revokeSession } from "@/lib/hn/sessions.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-HN-Token",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

export const Route = createFileRoute("/api/hn/auth/logout")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const ctx = await requireHnAccess(request);
          await revokeSession(ctx.tenantId, ctx.sessionId);
          return json(200, { ok: true, revoked: true });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },
    },
  },
});
