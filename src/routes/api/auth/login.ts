import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withBypass } from "@/lib/db/tenant.server";
import { verifyPassword } from "@/lib/auth/password.server";
import { signSession } from "@/lib/auth/jwt.server";
import { buildSessionCookie } from "@/lib/auth/cookies.server";
import { jsonError, jsonOk } from "@/lib/auth/session.server";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(256),
});

const DUMMY_HASH =
  "pbkdf2$600000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

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
        if (!parsed.success) return jsonError(400, "invalid_input");
        const { email, password } = parsed.data;

        try {
          const rows = await withBypass<{
            id: string;
            tenant_id: string;
            password_hash: string;
          }>(
            (sql) => sql`
              SELECT id, tenant_id, password_hash
                FROM users
               WHERE email = ${email}
               LIMIT 1
            `,
          );

          if (rows.length === 0) {
            // constant-time-ish: still run pbkdf2 to mask user enumeration
            await verifyPassword(password, DUMMY_HASH);
            return jsonError(401, "invalid_credentials");
          }

          const row = rows[0];
          const ok = await verifyPassword(password, row.password_hash);
          if (!ok) return jsonError(401, "invalid_credentials");

          const token = await signSession({
            sub: row.id,
            tid: row.tenant_id,
            email,
          });
          return jsonOk(
            { user: { id: row.id, email, tenantId: row.tenant_id } },
            { headers: { "Set-Cookie": buildSessionCookie(token) } },
          );
        } catch (err) {
          console.error("login_failed", err);
          return jsonError(500, "login_failed");
        }
      },
    },
  },
});
