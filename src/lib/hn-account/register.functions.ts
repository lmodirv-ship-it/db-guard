import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt, randomBytes } from "node:crypto";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashPassword } from "@/lib/auth/password.server";
import { sendEmail } from "@/lib/email";
import { renderOtpEmail } from "@/lib/email/templates/otp";
import { renderAdminSignupEmail, renderWelcomeEmail } from "@/lib/email/templates/admin-signup";

const OTP_TTL_MIN = 10;
const SESSION_TTL_MIN = 5;
const ADMIN_NOTIFY_EMAIL = "indo@hnchat.net";

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

function generateUserCode(): string {
  // HN-XXXXXX  (6 digits)
  const digits = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return `HN-${digits}`;
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

function slugify(input: string, fallback: string): string {
  const base = (input || fallback)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32);
  return base || fallback;
}

async function uniqueWorkspaceSlug(seed: string): Promise<string> {
  const base = slugify(seed, "ws");
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const { data } = await supabaseAdmin
      .from("hn_workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
}

const ALLOWED_SOURCE_APPS = ["hn-chat", "hn-driver", "hn-souk", "hn-studio", "hn-video", "db-guard", "hn-account"] as const;

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
      .select("id, hn_user_code, source_app, redirect_url, full_name, email")
      .single();

    if (userErr || !user) return { ok: false as const, error: "internal" as const };

    // Provision workspace + database + api key (idempotent — skip if already exists)
    let workspace_id: string;
    let database_id: string;
    let api_key_plaintext: string | null = null;
    let api_key_id: string;
    let api_key_hint: string;

    const { data: existingWs } = await supabaseAdmin
      .from("hn_workspaces")
      .select("id")
      .eq("hn_user_id", user.id)
      .maybeSingle();

    if (existingWs) {
      workspace_id = existingWs.id;
      const { data: db } = await supabaseAdmin
        .from("hn_databases").select("id").eq("workspace_id", workspace_id).limit(1).maybeSingle();
      database_id = db?.id ?? "";
      const { data: key } = await supabaseAdmin
        .from("hn_api_keys").select("id, key_hint").eq("workspace_id", workspace_id).is("revoked_at", null).limit(1).maybeSingle();
      api_key_id = key?.id ?? "";
      api_key_hint = key?.key_hint ?? "";
    } else {
      const slug = await uniqueWorkspaceSlug(`${user.full_name}-${user.hn_user_code}`);
      const { data: ws, error: wsErr } = await supabaseAdmin
        .from("hn_workspaces")
        .insert({
          hn_user_id: user.id,
          name: `${user.full_name}'s workspace`,
          slug,
        })
        .select("id")
        .single();
      if (wsErr || !ws) return { ok: false as const, error: "internal" as const };
      workspace_id = ws.id;

      const { data: db, error: dbErr } = await supabaseAdmin
        .from("hn_databases")
        .insert({
          workspace_id,
          hn_user_id: user.id,
          name: "primary",
          status: "active",
        })
        .select("id")
        .single();
      if (dbErr || !db) return { ok: false as const, error: "internal" as const };
      database_id = db.id;

      // API key — show plaintext ONCE
      const raw = `hn_live_${randomBytes(24).toString("hex")}`;
      api_key_plaintext = raw;
      const { data: key, error: keyErr } = await supabaseAdmin
        .from("hn_api_keys")
        .insert({
          workspace_id,
          hn_user_id: user.id,
          label: "default",
          key_hash: sha256(raw),
          key_prefix: raw.slice(0, 8),
          key_hint: `${raw.slice(0, 12)}…${raw.slice(-4)}`,
        })
        .select("id, key_hint")
        .single();
      if (keyErr || !key) return { ok: false as const, error: "internal" as const };
      api_key_id = key.id;
      api_key_hint = key.key_hint;
    }

    // Bridge session
    const token = randomBytes(32).toString("hex");
    const token_hash = sha256(token);
    const session_expires_at = new Date(Date.now() + SESSION_TTL_MIN * 60_000).toISOString();

    await supabaseAdmin.from("hn_sessions").insert({
      user_id: user.id,
      hn_user_code: user.hn_user_code,
      source_app: user.source_app,
      token_hash,
      expires_at: session_expires_at,
    });

    // Capture device info (best-effort)
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      userAgent = getRequestHeader("user-agent") ?? null;
    } catch { /* not in request scope */ }

    // Send notification to admin + welcome to user (non-fatal)
    Promise.all([
      (async () => {
        try {
          const m = renderAdminSignupEmail({
            full_name: user.full_name,
            email: user.email,
            user_id: user.id,
            hn_user_code: user.hn_user_code,
            workspace_id,
            database_id,
            ip,
            user_agent: userAgent,
            source_app: user.source_app ?? "hn-account",
            registered_at: new Date().toISOString(),
          });
          await sendEmail({ to: ADMIN_NOTIFY_EMAIL, subject: m.subject, html: m.html, text: m.text });
        } catch (e) { console.error("admin_notify_failed", e); }
      })(),
      (async () => {
        try {
          const m = renderWelcomeEmail({ full_name: user.full_name, hn_user_code: user.hn_user_code });
          await sendEmail({ to: user.email, subject: m.subject, html: m.html, text: m.text });
        } catch (e) { console.error("welcome_email_failed", e); }
      })(),
    ]).catch(() => {});

    return {
      ok: true as const,
      hn_user_code: user.hn_user_code,
      user_id: user.id,
      full_name: user.full_name,
      email: user.email,
      source_app: user.source_app,
      redirect_url: user.redirect_url,
      session_token: token,
      expires_at: session_expires_at,
      workspace_id,
      database_id,
      api_key_id,
      api_key_hint,
      api_key: api_key_plaintext, // null on resume; only present on first verify
    };
  });
