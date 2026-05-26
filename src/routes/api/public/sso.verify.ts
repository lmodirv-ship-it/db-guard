import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signSession } from "@/lib/auth/jwt.server";
import { sha256Hex } from "@/lib/crypto/web-crypto";

const APP_JWT_TTL_SECONDS = 60 * 60 * 24;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const Route = createFileRoute("/api/public/sso/verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: { ticket?: string; app_key?: string } = {};
        try { body = await request.json(); } catch {}
        const ticket = String(body.ticket ?? "").trim();
        const app_key = String(body.app_key ?? "").trim();
        if (!ticket || !app_key) {
          return new Response(JSON.stringify({ ok: false, error: "missing_params" }), { status: 400, headers: cors });
        }

        const { data: rec } = await supabaseAdmin
          .from("hn_sso_tickets")
          .select("*")
          .eq("ticket_hash", sha256(ticket))
          .eq("target_app", app_key)
          .is("used_at", null)
          .gte("expires_at", new Date().toISOString())
          .maybeSingle();
        if (!rec) {
          return new Response(JSON.stringify({ ok: false, error: "invalid_ticket" }), { status: 401, headers: cors });
        }
        await supabaseAdmin.from("hn_sso_tickets").update({ used_at: new Date().toISOString() }).eq("id", rec.id);

        const { data: user } = await supabaseAdmin
          .from("hn_users")
          .select("id, hn_user_code, email, full_name, plan, status")
          .eq("id", rec.user_id)
          .maybeSingle();
        if (!user) {
          return new Response(JSON.stringify({ ok: false, error: "user_missing" }), { status: 404, headers: cors });
        }
        if (user.status && user.status !== "active") {
          return new Response(JSON.stringify({ ok: false, error: "account_disabled" }), { status: 403, headers: cors });
        }

        await supabaseAdmin.from("hn_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);

        const jwt = await signSession({ sub: user.id, tid: user.id, email: user.email }, APP_JWT_TTL_SECONDS);

        return new Response(JSON.stringify({
          ok: true,
          user: {
            id: user.id,
            hn_user_code: user.hn_user_code,
            email: user.email,
            full_name: user.full_name,
            plan: user.plan,
            status: user.status,
          },
          jwt,
          expires_in: APP_JWT_TTL_SECONDS,
        }), { status: 200, headers: cors });
      },
    },
  },
});
