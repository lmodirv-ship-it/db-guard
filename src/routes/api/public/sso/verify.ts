/**
 * Public SSO verify endpoint — called by external sites (hn-db.fun, otobo, etc.)
 * to exchange a one-time ticket for a session token.
 *
 * POST /api/public/sso/verify
 * Body: { ticket: string, app_key: string }
 * Returns: { ok, user, session_token, expires_at }
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { consumeTicket } from "@/lib/sso/sso.server";
import { withApiLog } from "@/lib/platform/api-log.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const VerifySchema = z.object({
  ticket: z.string().min(10).max(200),
  app_key: z.string().min(2).max(80),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/sso/verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: withApiLog(async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
        const parsed = VerifySchema.safeParse(body);
        if (!parsed.success) return json(400, { ok: false, error: "invalid_input" });

        const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for");
        const ua = request.headers.get("user-agent");

        try {
          const result = await consumeTicket({
            ticket: parsed.data.ticket,
            app_key: parsed.data.app_key,
            ip,
            user_agent: ua,
          });
          return json(200, {
            ok: true,
            user: {
              hn_user_code: result.user.hn_user_code,
              full_name: result.user.full_name,
              email: result.user.email,
              phone: result.user.phone,
              email_verified: result.user.email_verified,
            },
            session_token: result.session_token,
            expires_at: result.expires_at,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "verify_failed";
          const code =
            msg === "invalid_app" || msg === "invalid_ticket" || msg === "ticket_used" || msg === "ticket_expired"
              ? 401 : 500;
          return json(code, { ok: false, error: msg });
        }
      }),
    },
  },
});
