import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyPassword } from "@/lib/auth/password.server";
import { signSession, SESSION_COOKIE } from "@/lib/auth/jwt.server";
import { jsonError, jsonOk } from "@/lib/auth/session.server";

const LoginSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(256),
  remember: z.boolean().optional().default(false),
});

const HN_CODE = /^HN-\d{6}$/i;
const ONE_DAY = 60 * 60 * 24;

function buildCookie(token: string, maxAgeSeconds: number): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError(400, "invalid_json");
        }

        const parsed = LoginSchema.safeParse(body);
        if (!parsed.success) {
          console.warn("[login] invalid_input", parsed.error.flatten());
          return jsonError(400, "invalid_input");
        }

        const { identifier, password, remember } = parsed.data;
        const isHnCode = HN_CODE.test(identifier);
        const lookupVal = isHnCode ? identifier.toUpperCase() : identifier.toLowerCase();

        console.log("[login] attempt", { mode: isHnCode ? "hn_code" : "email", identifier: lookupVal });

        try {
          const query = supabaseAdmin
            .from("hn_users")
            .select("id, email, full_name, hn_user_code, password_hash, status")
            .limit(1);

          const { data: rows, error } = isHnCode
            ? await query.eq("hn_user_code", lookupVal)
            : await query.eq("email", lookupVal);

          if (error) {
            console.error("[login] db_error", error);
            return jsonError(500, "login_failed");
          }

          const user = rows?.[0];
          if (!user) {
            console.warn("[login] user_not_found", { lookupVal });
            // Constant-time mock verify to avoid timing oracle
            await verifyPassword(password, "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
            return jsonError(404, "user_not_found");
          }

          if (user.status && user.status !== "active") {
            console.warn("[login] user_blocked", { id: user.id, status: user.status });
            return jsonError(403, "account_disabled");
          }

          const ok = await verifyPassword(password, user.password_hash);
          if (!ok) {
            console.warn("[login] wrong_password", { id: user.id });
            return jsonError(401, "wrong_password");
          }

          // Use hn_user.id as both sub and tid (workspace lookup happens via hn_user_id).
          const ttl = remember ? ONE_DAY * 30 : ONE_DAY * 7;
          const token = await signSession(
            { sub: user.id, tid: user.id, email: user.email },
            ttl,
          );

          // Best-effort: stamp last_login_at, never block login.
          supabaseAdmin
            .from("hn_users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", user.id)
            .then(({ error: e }) => { if (e) console.error("[login] last_login_update_failed", e); });

          console.log("[login] success", { id: user.id, hn_user_code: user.hn_user_code, remember });

          return jsonOk(
            {
              user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                hn_user_code: user.hn_user_code,
              },
            },
            { headers: { "Set-Cookie": buildCookie(token, ttl) } },
          );
        } catch (err) {
          console.error("[login] unexpected", err);
          return jsonError(500, "login_failed");
        }
      },
    },
  },
});
