import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSessionFromRequest } from "@/lib/auth/session.server";
import { sha256Hex } from "@/lib/crypto/web-crypto";

const sha256 = sha256Hex;

async function getCurrentUserId(): Promise<string | null> {
  const session = await getSessionFromRequest(getRequest());
  return session?.sub ?? null;
}

export const listMySessions = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, error: "unauthenticated" as const };

  const { data, error } = await supabaseAdmin
    .from("hn_sessions")
    .select("id, source_app, device, user_agent, ip_address, last_active_at, expires_at, revoked_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { ok: false as const, error: "internal" as const };
  return { ok: true as const, sessions: data ?? [] };
});

const revokeSchema = z.object({ session_id: z.string().uuid() });
export const revokeSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => revokeSchema.parse(d))
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false as const, error: "unauthenticated" as const };

    const { error } = await supabaseAdmin
      .from("hn_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.session_id)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: "internal" as const };
    return { ok: true as const };
  });

export const revokeAllOtherSessions = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, error: "unauthenticated" as const };

  // Find current session (if cookie exists, hash it and skip it)
  let currentHash: string | null = null;
  try {
    const cookieHeader = getRequest().headers.get("cookie") ?? "";
    const m = cookieHeader.match(/(?:^|;\s*)hn_session=([^;]+)/);
    if (m) currentHash = sha256(m[1]);
  } catch {}

  const q = supabaseAdmin
    .from("hn_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
  const { error } = currentHash ? await q.neq("token_hash", currentHash) : await q;
  if (error) return { ok: false as const, error: "internal" as const };
  return { ok: true as const };
});
