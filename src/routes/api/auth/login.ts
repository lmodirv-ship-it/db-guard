import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
import { verifyPassword } from "@/lib/auth/password.server";
import { signSession } from "@/lib/auth/jwt.server";
import { buildSessionCookie } from "@/lib/auth/cookies.server";
import { jsonError, jsonOk } from "@/lib/auth/session.server";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(256),
});

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

        const sql = getSql();
        try {
          const rows = (await sql`
            SELECT id, tenant_id, password_hash, role
            FROM users
            WHERE email = ${email}
            LIMIT 1
          `) as Array<{ id: string; tenant_id: string; password_hash: string; role: string }>;

          if (rows.length === 0) {
            // Same delay path as wrong password to avoid user enumeration.
            await verifyPassword(password, "pbkdf2$600000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
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
            { user: { id: row.id, email, tenantId: row.tenant_id, role: row.role } },
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
