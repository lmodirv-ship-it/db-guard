/**
 * HN SSO server-only helpers.
 * Uses supabaseAdmin to write to hn_users / hn_sessions / hn_sso_tickets.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashPassword, verifyPassword } from "@/lib/auth/password.server";

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomToken(byteLen = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLen));
  return b64url(bytes);
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const arr = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, "0");
  return hex;
}

const ALLOWED_HOSTS = new Set<string>([
  "hn-bd.online",
  "www.hn-bd.online",
  "hn-db.fun",
  "www.hn-db.fun",
  "otobo.hn-bd.online",
  "localhost",
  "127.0.0.1",
]);

export function isAllowedRedirect(url: string): boolean {
  try {
    const u = new URL(url);
    if (ALLOWED_HOSTS.has(u.hostname)) return true;
    // Allow lovable preview/published subdomains
    if (u.hostname.endsWith(".lovable.app")) return true;
    return false;
  } catch {
    return false;
  }
}

export type HnUser = {
  id: string;
  hn_user_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  email_verified: boolean;
};

export async function findUserByEmail(email: string): Promise<HnUser | null> {
  const { data, error } = await supabaseAdmin
    .from("hn_users")
    .select("id, hn_user_code, full_name, email, phone, password_hash, email_verified")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as HnUser | null) ?? null;
}

export async function createUser(input: {
  full_name: string;
  email: string;
  phone: string | null;
  password: string;
  source_app: string | null;
  redirect_url: string | null;
}): Promise<HnUser> {
  const password_hash = await hashPassword(input.password);

  // Generate hn_user_code via DB function
  const { data: codeRow, error: codeErr } = await supabaseAdmin
    .rpc("generate_hn_user_code");
  if (codeErr) throw new Error(codeErr.message);
  const hn_user_code = codeRow as unknown as string;

  const { data, error } = await supabaseAdmin
    .from("hn_users")
    .insert({
      hn_user_code,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      password_hash,
      source_app: input.source_app,
      redirect_url: input.redirect_url,
      registration_source: input.source_app ?? "hn-bd.online",
      status: "active",
      email_verified: false,
    })
    .select("id, hn_user_code, full_name, email, phone, password_hash, email_verified")
    .single();
  if (error) throw new Error(error.message);

  // Create default workspace (best-effort)
  try {
    await supabaseAdmin.from("hn_workspaces").insert({
      hn_user_id: data.id,
      name: "Workspace",
      slug: `ws-${hn_user_code.toLowerCase()}`,
    });
  } catch (e) {
    console.error("workspace_create_failed", e);
  }

  return data as HnUser;
}

export async function checkPassword(user: HnUser, password: string): Promise<boolean> {
  return verifyPassword(password, user.password_hash);
}

const TICKET_TTL_SECONDS = 60;
const SESSION_TTL_DAYS = 30;

export async function issueTicket(opts: {
  user: HnUser;
  target_app: string;
  redirect_url: string;
  source_app: string | null;
}): Promise<{ ticket: string; expires_at: string }> {
  const ticket = randomToken(32);
  const ticket_hash = await sha256Hex(ticket);
  const expires_at = new Date(Date.now() + TICKET_TTL_SECONDS * 1000).toISOString();

  const { error } = await supabaseAdmin.from("hn_sso_tickets").insert({
    user_id: opts.user.id,
    hn_user_code: opts.user.hn_user_code,
    ticket_hash,
    target_app: opts.target_app,
    source_app: opts.source_app,
    redirect_url: opts.redirect_url,
    expires_at,
  });
  if (error) throw new Error(error.message);
  return { ticket, expires_at };
}

export type ConsumedTicket = {
  user: HnUser;
  session_token: string;
  expires_at: string;
};

export async function consumeTicket(opts: {
  ticket: string;
  app_key: string;
  ip?: string | null;
  user_agent?: string | null;
}): Promise<ConsumedTicket> {
  // Verify app exists & active
  const { data: app, error: appErr } = await supabaseAdmin
    .from("connected_apps")
    .select("id, name, app_key, status")
    .eq("app_key", opts.app_key)
    .maybeSingle();
  if (appErr) throw new Error(appErr.message);
  if (!app || app.status !== "active") throw new Error("invalid_app");

  const ticket_hash = await sha256Hex(opts.ticket);
  const { data: ticketRow, error: tErr } = await supabaseAdmin
    .from("hn_sso_tickets")
    .select("id, user_id, hn_user_code, expires_at, used_at, target_app")
    .eq("ticket_hash", ticket_hash)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!ticketRow) throw new Error("invalid_ticket");
  // Bind ticket to the exact app it was issued for — prevents cross-app replay.
  if (ticketRow.target_app !== opts.app_key) throw new Error("invalid_ticket");
  if (ticketRow.used_at) throw new Error("ticket_used");
  if (new Date(ticketRow.expires_at).getTime() < Date.now()) throw new Error("ticket_expired");

  // Mark used
  const { error: usedErr } = await supabaseAdmin
    .from("hn_sso_tickets")
    .update({ used_at: new Date().toISOString() })
    .eq("id", ticketRow.id);
  if (usedErr) throw new Error(usedErr.message);

  // Load user
  const { data: user, error: uErr } = await supabaseAdmin
    .from("hn_users")
    .select("id, hn_user_code, full_name, email, phone, password_hash, email_verified")
    .eq("id", ticketRow.user_id)
    .single();
  if (uErr || !user) throw new Error("user_not_found");

  // Create session
  const session_token = randomToken(48);
  const token_hash = await sha256Hex(session_token);
  const expires_at = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000).toISOString();

  const { error: sErr } = await supabaseAdmin.from("hn_sessions").insert({
    user_id: user.id,
    hn_user_code: user.hn_user_code,
    token_hash,
    expires_at,
    source_app: ticketRow.target_app,
    ip_address: opts.ip ?? null,
    user_agent: opts.user_agent ?? null,
  });
  if (sErr) throw new Error(sErr.message);

  // Update last login
  await supabaseAdmin
    .from("hn_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  return { user: user as HnUser, session_token, expires_at };
}

export async function getSessionUser(session_token: string): Promise<HnUser | null> {
  const token_hash = await sha256Hex(session_token);
  const { data: session } = await supabaseAdmin
    .from("hn_sessions")
    .select("user_id, expires_at, revoked_at")
    .eq("token_hash", token_hash)
    .maybeSingle();
  if (!session) return null;
  if (session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const { data: user } = await supabaseAdmin
    .from("hn_users")
    .select("id, hn_user_code, full_name, email, phone, password_hash, email_verified")
    .eq("id", session.user_id)
    .single();
  return (user as HnUser | null) ?? null;
}
