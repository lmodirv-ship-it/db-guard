import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email";
import { renderOtpEmail } from "@/lib/email/templates/otp";

const CODE_TTL_MINUTES = 10;
const MAX_REQUESTS_PER_HOUR = 3;
const MAX_VERIFY_ATTEMPTS = 5;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  // 6 digits, zero-padded
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function logAudit(params: {
  email?: string;
  user_id?: string;
  event: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("auth_audit_log").insert({
    email: params.email ?? null,
    user_id: params.user_id ?? null,
    event: params.event,
    success: params.success,
    metadata: params.metadata ?? null,
  });
}

const requestOtpSchema = z.object({
  email: z.string().email().toLowerCase().max(255),
});

export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => requestOtpSchema.parse(d))
  .handler(async ({ data }) => {
    const { email } = data;

    // Rate limit: max 3 codes per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("email_verification_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      await logAudit({ email, event: "otp_request", success: false, metadata: { reason: "rate_limited" } });
      return { ok: false, error: "rate_limited" as const };
    }

    const code = generateCode();
    const code_hash = hashCode(code);
    const expires_at = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseAdmin.from("email_verification_codes").insert({
      email,
      code_hash,
      purpose: "login",
      expires_at,
    });
    if (insertErr) {
      await logAudit({ email, event: "otp_request", success: false, metadata: { db_error: insertErr.message } });
      return { ok: false, error: "internal" as const };
    }

    const { html, text, subject } = renderOtpEmail({ code, minutes: CODE_TTL_MINUTES });
    try {
      await sendEmail({ to: email, subject, html, text });
    } catch (e) {
      await logAudit({
        email,
        event: "otp_request",
        success: false,
        metadata: { send_error: e instanceof Error ? e.message : String(e) },
      });
      return { ok: false, error: "email_failed" as const };
    }

    await logAudit({ email, event: "otp_request", success: true });
    return { ok: true as const, expiresInSeconds: CODE_TTL_MINUTES * 60 };
  });

const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase().max(255),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; code: string }) => verifyOtpSchema.parse(d))
  .handler(async ({ data }) => {
    const { email, code } = data;
    const code_hash = hashCode(code);

    // Find latest non-used non-expired code for email
    const { data: rows } = await supabaseAdmin
      .from("email_verification_codes")
      .select("*")
      .eq("email", email)
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const record = rows?.[0];
    if (!record) {
      await logAudit({ email, event: "otp_verify", success: false, metadata: { reason: "no_code" } });
      return { ok: false as const, error: "invalid_code" as const };
    }

    if ((record.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
      await logAudit({ email, event: "otp_verify", success: false, metadata: { reason: "too_many_attempts" } });
      return { ok: false as const, error: "too_many_attempts" as const };
    }

    if (record.code_hash !== code_hash) {
      await supabaseAdmin
        .from("email_verification_codes")
        .update({ attempts: (record.attempts ?? 0) + 1 })
        .eq("id", record.id);
      await logAudit({ email, event: "otp_verify", success: false, metadata: { reason: "wrong_code" } });
      return { ok: false as const, error: "invalid_code" as const };
    }

    // Mark code used
    await supabaseAdmin
      .from("email_verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", record.id);

    // Generate magic link / session via Supabase Admin API.
    // We use generateLink with type=magiclink to get an action link, and exchange to a session.
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkErr || !linkData) {
      await logAudit({ email, event: "otp_verify", success: false, metadata: { reason: "link_failed", err: linkErr?.message } });
      return { ok: false as const, error: "internal" as const };
    }

    // Extract the email_otp hashed token Supabase generates — client will exchange it.
    const properties = linkData.properties;
    const userId = linkData.user?.id;

    await logAudit({
      email,
      user_id: userId,
      event: "otp_verify",
      success: true,
    });

    return {
      ok: true as const,
      // Hashed OTP token clients can verify with verifyOtp({ type: 'email', token_hash })
      tokenHash: properties.hashed_token,
      verificationType: properties.verification_type,
    };
  });
