import { createServerFn } from "@tanstack/react-start";
import { getRequest, getResponseHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signSession, verifySession } from "@/lib/auth/jwt.server";
import { sendRegistrationEmail } from "@/lib/email/send-registration.server";

const ID_COOKIE = "hn_id_session";
const COOKIE_TTL = 60 * 60 * 24 * 30; // 30 days
const NOTIFY_TO = "info@hnchat.net";

function buildCookie(token: string, maxAge = COOKIE_TTL) {
  return `${ID_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function readCookie(req: Request): string | null {
  const h = req.headers.get("cookie");
  if (!h) return null;
  for (const part of h.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === ID_COOKIE) return rest.join("=");
  }
  return null;
}

function appendSetCookie(value: string) {
  const existing = getResponseHeader("set-cookie");
  if (!existing) {
    setResponseHeader("set-cookie", value);
  } else if (Array.isArray(existing)) {
    setResponseHeader("set-cookie", [...existing, value]);
  } else {
    setResponseHeader("set-cookie", [String(existing), value]);
  }
}

async function generateUniqueLoginId(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const n = Math.floor(100000 + Math.random() * 900000);
    const candidate = `ID${n}`;
    const { data } = await supabaseAdmin
      .from("id_users")
      .select("id")
      .eq("login_id", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error("Could not generate unique login_id");
}

const registerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().max(40).optional().default(""),
});

export const registerSimpleUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data }) => {
    // Reject if email already used
    const { data: existing } = await supabaseAdmin
      .from("id_users")
      .select("id, login_id")
      .eq("email", data.email)
      .maybeSingle();
    if (existing) {
      return { ok: false as const, error: "email_taken" as const };
    }

    const login_id = await generateUniqueLoginId();
    const { data: user, error } = await supabaseAdmin
      .from("id_users")
      .insert({
        login_id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        status: "active",
      })
      .select("id, login_id, full_name, email, phone, created_at")
      .single();

    if (error || !user) {
      return { ok: false as const, error: "internal" as const };
    }

    // Notification email — failure must not break signup
    try {
      const html = `
        <h2>تسجيل جديد — HN ID</h2>
        <ul>
          <li><b>الاسم:</b> ${escapeHtml(user.full_name)}</li>
          <li><b>الإيميل:</b> ${escapeHtml(user.email)}</li>
          <li><b>الهاتف:</b> ${escapeHtml(user.phone ?? "—")}</li>
          <li><b>Login ID:</b> <code>${user.login_id}</code></li>
          <li><b>وقت التسجيل:</b> ${new Date(user.created_at).toISOString()}</li>
        </ul>`;
      await sendEmail({
        to: NOTIFY_TO,
        subject: `New HN ID signup — ${user.login_id}`,
        html,
        text: `New signup\nName: ${user.full_name}\nEmail: ${user.email}\nPhone: ${user.phone ?? "-"}\nLogin ID: ${user.login_id}\nAt: ${user.created_at}`,
      });
    } catch (err) {
      console.error("notify_email_failed", err);
    }

    // Set session cookie
    const token = await signSession({ sub: user.id, tid: user.id, email: user.email }, COOKIE_TTL);
    appendSetCookie(buildCookie(token));

    return {
      ok: true as const,
      login_id: user.login_id,
      user: { id: user.id, full_name: user.full_name, email: user.email },
    };
  });

const loginSchema = z.object({
  login_id: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^ID\d{6}$/, "format"),
});

export const loginByLoginId = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const raw = (d ?? {}) as { login_id?: string };
    const cleaned = String(raw.login_id ?? "").trim().toUpperCase().replace(/\s+/g, "");
    return loginSchema.parse({ login_id: cleaned });
  })
  .handler(async ({ data }) => {
    const { data: user } = await supabaseAdmin
      .from("id_users")
      .select("id, login_id, full_name, email, status")
      .eq("login_id", data.login_id)
      .maybeSingle();
    if (!user || user.status !== "active") {
      return { ok: false as const, error: "invalid_id" as const };
    }
    const token = await signSession({ sub: user.id, tid: user.id, email: user.email }, COOKIE_TTL);
    appendSetCookie(buildCookie(token));
    return { ok: true as const, login_id: user.login_id };
  });

export const getCurrentSimpleUser = createServerFn({ method: "GET" }).handler(async () => {
  const req = getRequest();
  const token = readCookie(req);
  if (!token) return { ok: false as const, user: null };
  try {
    const claims = await verifySession(token);
    const { data: user } = await supabaseAdmin
      .from("id_users")
      .select("id, login_id, full_name, email, phone, created_at")
      .eq("id", claims.sub)
      .maybeSingle();
    if (!user) return { ok: false as const, user: null };
    return { ok: true as const, user };
  } catch {
    return { ok: false as const, user: null };
  }
});

export const logoutSimpleUser = createServerFn({ method: "POST" }).handler(async () => {
  appendSetCookie(`${ID_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return { ok: true as const };
});

// Personal records, scoped per id_user
const recordSchema = z.object({
  title: z.string().trim().min(1).max(255),
  data: z.record(z.string(), z.unknown()).default({}),
});

async function requireSimpleUser(): Promise<{ id: string } | null> {
  const req = getRequest();
  const token = readCookie(req);
  if (!token) return null;
  try {
    const claims = await verifySession(token);
    return { id: claims.sub };
  } catch {
    return null;
  }
}

export const listMyIdRecords = createServerFn({ method: "GET" }).handler(async () => {
  const u = await requireSimpleUser();
  if (!u) return { ok: false as const, error: "unauth" as const };
  const { data } = await supabaseAdmin
    .from("id_user_records")
    .select("id, title, data, created_at")
    .eq("owner_id", u.id)
    .order("created_at", { ascending: false })
    .limit(200);
  return { ok: true as const, records: data ?? [] };
});

export const createMyIdRecord = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => recordSchema.parse(d))
  .handler(async ({ data }) => {
    const u = await requireSimpleUser();
    if (!u) return { ok: false as const, error: "unauth" as const };
    const { data: row, error } = await supabaseAdmin
      .from("id_user_records")
      .insert({ owner_id: u.id, title: data.title, data: data.data as never })
      .select("id, title, data, created_at")
      .single();
    if (error) return { ok: false as const, error: "internal" as const };
    return { ok: true as const, record: row };
  });

export const deleteMyIdRecord = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const u = await requireSimpleUser();
    if (!u) return { ok: false as const, error: "unauth" as const };
    await supabaseAdmin.from("id_user_records").delete().eq("id", data.id).eq("owner_id", u.id);
    return { ok: true as const };
  });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
