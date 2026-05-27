/**
 * Public SSO 'me' endpoint — external sites send Bearer <session_token>
 * to load the current HN user.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/sso/sso.server";
import { withApiLog } from "@/lib/platform/api-log.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/sso/me")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: withApiLog(async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!token) return json(401, { ok: false, error: "missing_token" });
        try {
          const user = await getSessionUser(token);
          if (!user) return json(401, { ok: false, error: "invalid_session" });
          return json(200, {
            ok: true,
            user: {
              hn_user_code: user.hn_user_code,
              full_name: user.full_name,
              email: user.email,
              phone: user.phone,
              email_verified: user.email_verified,
            },
          });
        } catch (err) {
          console.error("sso_me_failed", err);
          return json(500, { ok: false, error: "lookup_failed" });
        }
      }),
    },
  },
});
