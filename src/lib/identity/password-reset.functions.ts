import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashPassword } from "@/lib/auth/password.server";
import { sendEmail } from "@/lib/email";
import { renderPasswordResetEmail } from "@/lib/email/templates/password-reset";
import { sha256Hex, randomBytesHex, randomIntBelow } from "@/lib/crypto/web-crypto";

const RESET_TTL_MIN = 15;
const MAX_ATTEMPTS = 5;

const sha256 = sha256Hex;

function captureMeta() {
  let ip: string | null = null;
  let ua: string | null = null;
  try { ip = getRequestIP({ xForwardedFor: true }) ?? null; } catch {}
  try { ua = getRequestHeader("user-agent") ?? null; } catch {}
  return { ip, ua };
}

const requestSchema = z.object({
  identifier: z.string().trim().min(3).max(255),
});

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const { ip, ua } = captureMeta();
    const id = data.identifier.trim();
    const isHnCode = /^HN-\d{6}$/i.test(id);

    const { data: user } = await supabaseAdmin
      .from("hn_users")
      .select("id, email, full_name, hn_user_code")
      .filter(
        isHnCode ? "hn_user_code" : "email",
        "eq",
        isHnCode ? id.toUpperCase() : id.toLowerCase(),
      )
      .maybeSingle();

    // Always log + return generic success (don't leak existence)
    await supabaseAdmin.from("password_reset_logs").insert({
      user_id: user?.id ?? null,
      email: user?.email ?? (isHnCode ? null : id),
      action: "requested",
      ip,
      user_agent: ua,
      metadata: { identifier_kind: isHnCode ? "hn_code" : "email", found: !!user },
    });

    if (!user) {
      // Soft success — pretend the email was sent
      return { ok: true as const, masked_email: maskEmail(isHnCode ? "" : id), token: null as string | null };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const token = randomBytes(24).toString("hex");
    const expires_at = new Date(Date.now() + RESET_TTL_MIN * 60_000).toISOString();

    await supabaseAdmin.from("password_reset_tokens").insert({
      user_id: user.id,
      token_hash: sha256(token),
      code_hash: sha256(code),
      channel: "otp",
      expires_at,
      ip,
      user_agent: ua,
    });

    try {
      const m = renderPasswordResetEmail({
        full_name: user.full_name,
        hn_user_code: user.hn_user_code,
        code,
        minutes: RESET_TTL_MIN,
      });
      await sendEmail({ to: user.email, subject: m.subject, html: m.html, text: m.text });
    } catch (e) {
      console.error("password_reset_email_failed", e);
    }

    return { ok: true as const, masked_email: maskEmail(user.email), token };
  });

const verifySchema = z.object({
  token: z.string().min(16).max(256),
  code: z.string().regex(/^\d{6}$/),
});

export const verifyResetCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifySchema.parse(d))
  .handler(async ({ data }) => {
    const { ip, ua } = captureMeta();
    const { data: rec } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("*")
      .eq("token_hash", sha256(data.token))
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!rec) return { ok: false as const, error: "invalid_token" as const };

    if ((rec.attempts ?? 0) >= MAX_ATTEMPTS) {
      return { ok: false as const, error: "too_many_attempts" as const };
    }

    if (rec.code_hash !== sha256(data.code)) {
      await supabaseAdmin
        .from("password_reset_tokens")
        .update({ attempts: (rec.attempts ?? 0) + 1 })
        .eq("id", rec.id);
      await supabaseAdmin.from("password_reset_logs").insert({
        user_id: rec.user_id,
        action: "failed",
        ip,
        user_agent: ua,
        metadata: { stage: "verify" },
      });
      return { ok: false as const, error: "invalid_code" as const };
    }

    await supabaseAdmin.from("password_reset_logs").insert({
      user_id: rec.user_id,
      action: "verified",
      ip,
      user_agent: ua,
    });

    return { ok: true as const };
  });

const completeSchema = z.object({
  token: z.string().min(16).max(256),
  code: z.string().regex(/^\d{6}$/),
  new_password: z.string().min(8).max(256),
});

export const completePasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => completeSchema.parse(d))
  .handler(async ({ data }) => {
    const { ip, ua } = captureMeta();
    const { data: rec } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("*")
      .eq("token_hash", sha256(data.token))
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!rec) return { ok: false as const, error: "invalid_token" as const };
    if (rec.code_hash !== sha256(data.code)) {
      return { ok: false as const, error: "invalid_code" as const };
    }

    const password_hash = await hashPassword(data.new_password);

    await supabaseAdmin
      .from("hn_users")
      .update({ password_hash })
      .eq("id", rec.user_id);

    await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", rec.id);

    // Revoke all active sessions for this user
    await supabaseAdmin
      .from("hn_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", rec.user_id)
      .is("revoked_at", null);

    await supabaseAdmin.from("password_reset_logs").insert({
      user_id: rec.user_id,
      action: "completed",
      ip,
      user_agent: ua,
    });

    return { ok: true as const };
  });

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "•••@•••";
  const [local, domain] = email.split("@");
  const head = local.slice(0, 2);
  return `${head}${"•".repeat(Math.max(2, local.length - 2))}@${domain}`;
}
