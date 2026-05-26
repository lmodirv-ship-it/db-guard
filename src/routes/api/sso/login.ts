import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import {
  checkPassword,
  findUserByEmail,
  isAllowedRedirect,
  issueTicket,
} from "@/lib/sso/sso.server";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(256),
  app: z.string().trim().min(1).max(80).optional(),
  redirect: z.string().url().max(500).optional(),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export const Route = createFileRoute("/api/sso/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
        const parsed = LoginSchema.safeParse(body);
        if (!parsed.success) return json(400, { ok: false, error: "invalid_input" });

        const { email, password, app, redirect } = parsed.data;
        const target_app = app ?? "hn-bd-online";
        const redirect_url = redirect ?? "https://hn-bd.online/";

        if (redirect && !isAllowedRedirect(redirect)) {
          return json(400, { ok: false, error: "redirect_not_allowed" });
        }

        try {
          const user = await findUserByEmail(email);
          if (!user) return json(401, { ok: false, error: "invalid_credentials" });
          const ok = await checkPassword(user, password);
          if (!ok) return json(401, { ok: false, error: "invalid_credentials" });

          const { ticket, expires_at } = await issueTicket({
            user, target_app, redirect_url, source_app: target_app,
          });

          return json(200, {
            ok: true,
            user: { hn_user_code: user.hn_user_code, full_name: user.full_name, email: user.email },
            ticket,
            redirect_url,
            expires_at,
          });
        } catch (err) {
          console.error("sso_login_failed", err);
          return json(500, { ok: false, error: "login_failed" });
        }
      },
    },
  },
});
