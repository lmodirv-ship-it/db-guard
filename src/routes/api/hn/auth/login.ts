/**
 * HN Auth — independent login. Issues an `hns_…` bearer token.
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
import { verifyPassword } from "@/lib/auth/password.server";
import { issueSession } from "@/lib/hn/sessions.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-HN-Site",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

const Schema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(256),
  site: z.string().trim().toLowerCase().optional(),
});

export const Route = createFileRoute("/api/hn/auth/login")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return json(400, { ok: false, error: "invalid_input" });
        const { email, password, site } = parsed.data;

        const sql = getSql();
        const rows = (await sql`
          SELECT id, tenant_id, password_hash, name FROM users WHERE email = ${email} LIMIT 1
        `) as Array<{ id: string; tenant_id: string; password_hash: string; name: string | null }>;

        if (!rows.length) {
          await verifyPassword(password, "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
          return json(401, { ok: false, error: "invalid_credentials" });
        }
        const u = rows[0];
        const ok = await verifyPassword(password, u.password_hash);
        if (!ok) return json(401, { ok: false, error: "invalid_credentials" });

        const { token, session } = await issueSession({
          tenantId: u.tenant_id, userId: u.id,
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
          user: { id: u.id, email, name: u.name, tenant_id: u.tenant_id },
        });
      },
    },
  },
});
