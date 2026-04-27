import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withBypass } from "@/lib/db/tenant.server";
import { hashPassword } from "@/lib/auth/password.server";
import { signSession } from "@/lib/auth/jwt.server";
import { buildSessionCookie } from "@/lib/auth/cookies.server";
import { jsonError, jsonOk } from "@/lib/auth/session.server";

const SignupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(256),
  name: z.string().trim().min(1).max(120).optional(),
});

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError(400, "invalid_json");
        }
        const parsed = SignupSchema.safeParse(body);
        if (!parsed.success) {
          return jsonError(400, "invalid_input", { issues: parsed.error.issues });
        }
        const { email, password, name } = parsed.data;

        try {
          const existing = await withBypass<{ id: string }>(
            (sql) => sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`,
          );
          if (existing.length > 0) return jsonError(409, "email_taken");

          const passwordHash = await hashPassword(password);

          const tenantRows = await withBypass<{ id: string }>(
            (sql) => sql`
              INSERT INTO tenants (name)
              VALUES (${name ?? email.split("@")[0]})
              RETURNING id
            `,
          );
          const tenantId = tenantRows[0].id;

          const userRows = await withBypass<{ id: string }>(
            (sql) => sql`
              INSERT INTO users (tenant_id, email, password_hash, name, role)
              VALUES (${tenantId}, ${email}, ${passwordHash}, ${name ?? null}, 'owner')
              RETURNING id
            `,
          );
          const userId = userRows[0].id;

          const token = await signSession({ sub: userId, tid: tenantId, email });
          return jsonOk(
            { user: { id: userId, email, tenantId } },
            { headers: { "Set-Cookie": buildSessionCookie(token) } },
          );
        } catch (err) {
          console.error("signup_failed", err);
          return jsonError(500, "signup_failed");
        }
      },
    },
  },
});
