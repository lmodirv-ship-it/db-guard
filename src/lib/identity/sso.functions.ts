import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSessionFromRequest } from "@/lib/auth/session.server";
import { signSession } from "@/lib/auth/jwt.server";
import { sha256Hex, randomBytesHex } from "@/lib/crypto/web-crypto";

const TICKET_TTL_SECONDS = 60;
const APP_JWT_TTL_SECONDS = 60 * 60 * 24; // 24h

const sha256 = sha256Hex;

function hostMatches(allowed: string[], host: string): boolean {
  for (const pattern of allowed) {
    if (pattern === host) return true;
    if (pattern.startsWith("*.")) {
      const base = pattern.slice(2);
      if (host === base || host.endsWith("." + base)) return true;
    }
  }
  return false;
}

const issueSchema = z.object({
  target_app: z.string().min(1).max(40),
  redirect_url: z.string().url().max(500),
});

export const issueSsoTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => issueSchema.parse(d))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await getSessionFromRequest(request);
    if (!session) return { ok: false as const, error: "unauthenticated" as const };

    // Validate target app + redirect host
    const { data: app } = await supabaseAdmin
      .from("connected_apps")
      .select("app_key, allowed_redirect_hosts, status")
      .eq("app_key", data.target_app)
      .maybeSingle();
    if (!app || app.status !== "active") {
      return { ok: false as const, error: "unknown_app" as const };
    }

    let host: string;
    try {
      host = new URL(data.redirect_url).host;
    } catch {
      return { ok: false as const, error: "bad_redirect" as const };
    }
    if (!hostMatches(app.allowed_redirect_hosts, host)) {
      return { ok: false as const, error: "redirect_not_allowed" as const };
    }

    const { data: user } = await supabaseAdmin
      .from("hn_users")
      .select("id, hn_user_code, source_app, status")
      .eq("id", session.sub)
      .maybeSingle();
    if (!user) return { ok: false as const, error: "user_missing" as const };
    if (user.status && user.status !== "active") {
      return { ok: false as const, error: "account_disabled" as const };
    }

    const raw = randomBytesHex(32);
    const expires_at = new Date(Date.now() + TICKET_TTL_SECONDS * 1000).toISOString();
    const { error } = await supabaseAdmin.from("hn_sso_tickets").insert({
      ticket_hash: await sha256(raw),
      user_id: user.id,
      hn_user_code: user.hn_user_code,
      source_app: user.source_app ?? "dbguard",
      target_app: data.target_app,
      redirect_url: data.redirect_url,
      expires_at,
    });
    if (error) return { ok: false as const, error: "internal" as const };

    const url = new URL(data.redirect_url);
    url.searchParams.set("hn_ticket", raw);
    url.searchParams.set("hn_app", data.target_app);
    return { ok: true as const, ticket: raw, redirect_to: url.toString(), expires_at };
  });

const consumeSchema = z.object({
  ticket: z.string().min(16).max(256),
  app_key: z.string().min(1).max(40),
});

export const consumeSsoTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => consumeSchema.parse(d))
  .handler(async ({ data }) => {
    const ticket_hash = await sha256(data.ticket);
    const { data: rec } = await supabaseAdmin
      .from("hn_sso_tickets")
      .select("*")
      .eq("ticket_hash", ticket_hash)
      .eq("target_app", data.app_key)
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!rec) return { ok: false as const, error: "invalid_ticket" as const };

    await supabaseAdmin
      .from("hn_sso_tickets")
      .update({ used_at: new Date().toISOString() })
      .eq("id", rec.id);

    const { data: user } = await supabaseAdmin
      .from("hn_users")
      .select("id, hn_user_code, email, full_name, plan, status")
      .eq("id", rec.user_id)
      .maybeSingle();
    if (!user) return { ok: false as const, error: "user_missing" as const };
    if (user.status && user.status !== "active") {
      return { ok: false as const, error: "account_disabled" as const };
    }

    // Update last_login_at
    await supabaseAdmin
      .from("hn_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    // Record session in hn_sessions
    const ip = (() => { try { return getRequestIP({ xForwardedFor: true }) ?? null; } catch { return null; } })();
    const ua = (() => { try { return getRequestHeader("user-agent") ?? null; } catch { return null; } })();
    const session_token = randomBytesHex(32);
    await supabaseAdmin.from("hn_sessions").insert({
      user_id: user.id,
      hn_user_code: user.hn_user_code,
      source_app: data.app_key,
      token_hash: await sha256(session_token),
      expires_at: new Date(Date.now() + APP_JWT_TTL_SECONDS * 1000).toISOString(),
      ip_address: ip,
      user_agent: ua,
      device: deriveDevice(ua),
    });

    const jwt = await signSession(
      { sub: user.id, tid: user.id, email: user.email },
      APP_JWT_TTL_SECONDS,
    );

    return {
      ok: true as const,
      user: {
        id: user.id,
        hn_user_code: user.hn_user_code,
        email: user.email,
        full_name: user.full_name,
        plan: user.plan,
        status: user.status,
      },
      jwt,
      session_token,
      expires_in: APP_JWT_TTL_SECONDS,
    };
  });

function deriveDevice(ua: string | null): string {
  if (!ua) return "Unknown";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Web";
}
