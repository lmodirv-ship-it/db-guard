/**
 * HN Auth — independent signup.
 * Creates an hn_user (in `users`) + tenant + issues an HN bearer token.
 * Returns the raw `hns_…` token ONCE.
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
import { hashPassword } from "@/lib/auth/password.server";
import { issueSession } from "@/lib/hn/sessions.server";
import { withBypass } from "@/lib/db/tenant.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-HN-Site",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

const Schema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(256),
  name: z.string().trim().min(1).max(120).optional(),
  site: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,60}$/).optional(),
});

export const Route = createFileRoute("/api/hn/auth/signup")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return json(400, { ok: false, error: "invalid_input", issues: parsed.error.issues });
        const { email, password, name, site } = parsed.data;

        const sql = getSql();
        const existing = (await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`) as Array<{ id: string }>;
        if (existing.length) return json(409, { ok: false, error: "email_taken" });

        const passwordHash = await hashPassword(password);

        const created = await withBypass<{ user_id: string; tenant_id: string }>((s) => s`
          WITH t AS (
            INSERT INTO tenants (name) VALUES (${name ?? email.split("@")[0]}) RETURNING id
          ),
          u AS (
            INSERT INTO users (tenant_id, email, password_hash, name, role)
            SELECT t.id, ${email}, ${passwordHash}, ${name ?? null}, 'owner' FROM t
            RETURNING id, tenant_id
          )
          SELECT u.id AS user_id, u.tenant_id FROM u
        `);
        const { user_id: userId, tenant_id: tenantId } = created[0];

        // grant default member role in this tenant
        await withBypass((s) => s`
          INSERT INTO hn_user_roles (tenant_id, user_id, role_id)
          SELECT ${tenantId}, ${userId}, r.id
          FROM hn_roles r WHERE r.tenant_id IS NULL AND r.slug = 'member'
          ON CONFLICT DO NOTHING
        `);

        const { token, session } = await issueSession({
          tenantId, userId,
          sourceApp: site ?? "hn-sdk",
          userAgent: request.headers.get("user-agent"),
          ipAddress: request.headers.get("cf-connecting-ip")
            ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            ?? null,
        });

        return json(200, {
          ok: true,
          token,
          expires_at: session.expires_at,
          user: { id: userId, email, name: name ?? null, tenant_id: tenantId },
        });
      },
    },
  },
});
