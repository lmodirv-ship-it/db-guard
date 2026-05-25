import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { randomInt, randomBytes, createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashPassword } from "@/lib/auth/password.server";
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/jwt.server";
import { jsonError, jsonOk } from "@/lib/auth/session.server";

const RegisterSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  password: z.string().min(8).max(256),
  source_app: z.string().max(40).optional(),
});

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

function buildCookie(token: string): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join("; ");
}

async function generateUniqueUserCode(): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const code = `HN-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    const { data } = await supabaseAdmin
      .from("hn_users").select("id").eq("hn_user_code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("code_generation_failed");
}

function slugify(input: string): string {
  return (input || "ws")
    .toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 32) || "ws";
}

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return jsonError(400, "invalid_json"); }

        const parsed = RegisterSchema.safeParse(body);
        if (!parsed.success) {
          console.warn("[register] invalid_input", parsed.error.flatten());
          return jsonError(400, "invalid_input");
        }
        const { full_name, email, phone, password, source_app } = parsed.data;

        try {
          const { data: existing } = await supabaseAdmin
            .from("hn_users").select("id").eq("email", email).maybeSingle();
          if (existing) {
            console.warn("[register] email_taken", { email });
            return jsonError(409, "email_taken");
          }

          const password_hash = await hashPassword(password);
          const hn_user_code = await generateUniqueUserCode();

          const { data: user, error: insErr } = await supabaseAdmin
            .from("hn_users")
            .insert({
              full_name,
              email,
              phone: phone || null,
              password_hash,
              hn_user_code,
              source_app: source_app || "db-guard",
              email_verified: true, // direct registration, no OTP
              status: "active",
            })
            .select("id, hn_user_code, email, full_name")
            .single();
          if (insErr || !user) {
            console.error("[register] insert_failed", insErr);
            return jsonError(500, "register_failed");
          }

          // Provision workspace + database + api key (best-effort, non-fatal)
          try {
            const slug = `${slugify(full_name)}-${randomBytes(2).toString("hex")}`;
            const { data: ws } = await supabaseAdmin
              .from("hn_workspaces")
              .insert({ hn_user_id: user.id, name: `${full_name}'s workspace`, slug })
              .select("id").single();
            if (ws) {
              await supabaseAdmin.from("hn_databases").insert({
                workspace_id: ws.id, hn_user_id: user.id, name: "primary", status: "active",
              });
              const raw = `hn_live_${randomBytes(24).toString("hex")}`;
              await supabaseAdmin.from("hn_api_keys").insert({
                workspace_id: ws.id, hn_user_id: user.id, label: "default",
                key_hash: sha256(raw), key_prefix: raw.slice(0, 8),
                key_hint: `${raw.slice(0, 12)}…${raw.slice(-4)}`,
              });
            }
          } catch (e) {
            console.error("[register] provisioning_failed", e);
          }

          // Issue session immediately — no email needed
          const token = await signSession(
            { sub: user.id, tid: user.id, email: user.email },
            SESSION_TTL_SECONDS,
          );

          console.log("[register] success", { id: user.id, hn_user_code: user.hn_user_code });

          return jsonOk(
            {
              user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                hn_user_code: user.hn_user_code,
              },
            },
            { headers: { "Set-Cookie": buildCookie(token) } },
          );
        } catch (err) {
          console.error("[register] unexpected", err);
          return jsonError(500, "register_failed");
        }
      },
    },
  },
});
