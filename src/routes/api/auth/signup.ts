import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
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

        const sql = getSql();
        try {
          const existing = (await sql`
            SELECT id FROM users WHERE email = ${email} LIMIT 1
          `) as Array<{ id: string }>;
          if (existing.length > 0) {
            return jsonError(409, "email_taken");
          }

          const passwordHash = await hashPassword(password);

          // Create tenant + owner user atomically.
          const tenantRows = (await sql`
            INSERT INTO tenants (name)
            VALUES (${name ?? email.split("@")[0]})
            RETURNING id
          `) as Array<{ id: string }>;
          const tenantId = tenantRows[0].id;

          const userRows = (await sql`
            INSERT INTO users (tenant_id, email, password_hash, name, role)
            VALUES (${tenantId}, ${email}, ${passwordHash}, ${name ?? null}, 'owner')
            RETURNING id
          `) as Array<{ id: string }>;
          const userId = userRows[0].id;

          // Log visitor in the registrations table (best-effort).
          try {
            await sql`
              CREATE TABLE IF NOT EXISTS visitors (
                id            BIGSERIAL PRIMARY KEY,
                user_id       UUID,
                email         TEXT NOT NULL,
                name          TEXT,
                ip_address    TEXT,
                user_agent    TEXT,
                referer       TEXT,
                country       TEXT,
                registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
              )
            `;
            const ip =
              request.headers.get("cf-connecting-ip") ??
              request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
              null;
            const ua = request.headers.get("user-agent");
            const ref = request.headers.get("referer");
            const country = request.headers.get("cf-ipcountry");
            await sql`
              INSERT INTO visitors (user_id, email, name, ip_address, user_agent, referer, country)
              VALUES (${userId}, ${email}, ${name ?? null}, ${ip}, ${ua}, ${ref}, ${country})
            `;
          } catch (err) {
            console.error("visitor_log_failed", err);
          }

          // Provision default workspace + 8 default tables for the new tenant.
          try {
            await sql`SELECT provision_tenant_defaults(${tenantId}::uuid)`;
          } catch (err) {
            console.error("provision_defaults_failed", err);
          }




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
