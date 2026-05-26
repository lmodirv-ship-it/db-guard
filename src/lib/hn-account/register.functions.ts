import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashPassword } from "@/lib/auth/password.server";
import { sendEmail } from "@/lib/email";
import { renderOtpEmail } from "@/lib/email/templates/otp";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const OTP_TTL_MIN = 10;
const SESSION_TTL_MIN = 5;

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

function generateUserCode(): string {
  const letter = LETTERS[randomInt(0, LETTERS.length)];
  const digits = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return `${letter}${digits}`;
}

async function generateUniqueUserCode(): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const code = generateUserCode();
    const { data } = await supabaseAdmin
      .from("hn_users")
      .select("id")
      .eq("hn_user_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("code_generation_failed");
}

const ALLOWED_SOURCE_APPS = ["hn-chat", "hn-driver", "hn-souk", "db-guard", "hn-account"] as const;

const registerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().min(4).max(32).optional().or(z.literal("")),
  password: z.string().min(8).max(256),
  source_app: z.string().max(40).optional(),
  redirect_url: z.string().url().max(500).optional().or(z.literal("")),
});

export const registerHnAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data }) => {
    const source_app = data.source_app && (ALLOWED_SOURCE_APPS as readonly string[]).includes(data.source_app)
      ? data.source_app
      : "hn-account";

    const { data: existing } = await supabaseAdmin
      .from("hn_users")
      .select("id, email_verified")
      .eq("email", data.email)
      .maybeSingle();

    if (existing && existing.email_verified) {
      return { ok: false as const, error: "email_taken" as const };
    }

    const password_hash = await hashPassword(data.password);
    const hn_user_code = await generateUniqueUserCode();

    let userId: string;
    if (existing) {
      // overwrite the unverified record
      const { data: upd, error } = await supabaseAdmin
        .from("hn_users")
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
          password_hash,
          hn_user_code,
          source_app,
          redirect_url: data.redirect_url || null,
          email_verified: false,
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error || !upd) return { ok: false as const, error: "internal" as const };
      userId = upd.id;
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("hn_users")
        .insert({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          password_hash,
          hn_user_code,
          source_app,
          redirect_url: data.redirect_url || null,
        })
        .select("id")
        .single();
      if (error || !ins) {
        return { ok: false as const, error: "internal" as const };
      }
      userId = ins.id;
    }

    // Send OTP
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();
    await supabaseAdmin.from("email_verification_codes").insert({
      email: data.email,
      code_hash: sha256(code),
      purpose: "hn_register",
      expires_at,
    });

    try {
      const { html, text, subject } = renderOtpEmail({ code, minutes: OTP_TTL_MIN });
      await sendEmail({ to: data.email, subject, html, text });
    } catch (e) {
      // Email failure is non-fatal here; user can retry.
      console.error("hn_register_email_failed", e);
    }

    return {
      ok: true as const,
      user_id: userId,
      hn_user_code,
      email: data.email,
      source_app,
      redirect_url: data.redirect_url || null,
    };
  });

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  code: z.string().regex(/^\d{6}$/),
});

export const verifyHnAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifySchema.parse(d))
  .handler(async ({ data }) => {
    const code_hash = sha256(data.code);
    const { data: rows } = await supabaseAdmin
      .from("email_verification_codes")
      .select("*")
      .eq("email", data.email)
      .eq("purpose", "hn_register")
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const rec = rows?.[0];
    if (!rec) return { ok: false as const, error: "invalid_code" as const };
    if ((rec.attempts ?? 0) >= 5) return { ok: false as const, error: "too_many_attempts" as const };
    if (rec.code_hash !== code_hash) {
      await supabaseAdmin
        .from("email_verification_codes")
        .update({ attempts: (rec.attempts ?? 0) + 1 })
        .eq("id", rec.id);
      return { ok: false as const, error: "invalid_code" as const };
    }

    await supabaseAdmin
      .from("email_verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", rec.id);

    const { data: user, error: userErr } = await supabaseAdmin
      .from("hn_users")
      .update({ email_verified: true })
      .eq("email", data.email)
      .select("id, hn_user_code, source_app, redirect_url")
      .single();

    if (userErr || !user) return { ok: false as const, error: "internal" as const };

    // Issue a one-shot bridge session token
    const token = randomBytes(32).toString("hex");
    const token_hash = sha256(token);
    const expires_at = new Date(Date.now() + SESSION_TTL_MIN * 60_000).toISOString();

    await supabaseAdmin.from("hn_sessions").insert({
      user_id: user.id,
      hn_user_code: user.hn_user_code,
      source_app: user.source_app,
      token_hash,
      expires_at,
    });

    return {
      ok: true as const,
      hn_user_code: user.hn_user_code,
      source_app: user.source_app,
      redirect_url: user.redirect_url,
      session_token: token,
      expires_at,
    };
  });
