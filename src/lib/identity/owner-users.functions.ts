import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSessionFromRequest } from "@/lib/auth/session.server";

const OWNER_EMAILS = ["indo@hnchat.net", "lmodirv@gmail.com"];

async function isOwner(): Promise<{ ok: boolean; user_id: string | null }> {
  const session = await getSessionFromRequest(getRequest());
  if (!session) return { ok: false, user_id: null };

  // Check user_roles first
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", session.sub)
    .eq("role", "owner")
    .maybeSingle();
  if (role) return { ok: true, user_id: session.sub };

  // Fallback: hardcoded owner emails
  if (OWNER_EMAILS.includes(session.email.toLowerCase())) {
    // Auto-promote: insert role for next time
    await supabaseAdmin.from("user_roles").insert({ user_id: session.sub, role: "owner" });
    return { ok: true, user_id: session.sub };
  }
  return { ok: false, user_id: session.sub };
}

const listSchema = z.object({
  search: z.string().max(255).optional().default(""),
  source_app: z.string().max(40).optional().default(""),
  status: z.string().max(40).optional().default(""),
  plan: z.string().max(40).optional().default(""),
  limit: z.number().min(1).max(500).optional().default(100),
});

export const listRegisteredUsers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const owner = await isOwner();
    if (!owner.ok) return { ok: false as const, error: "forbidden" as const };

    let q = supabaseAdmin
      .from("hn_users")
      .select(
        "id, hn_user_code, email, full_name, phone, email_verified, source_app, registration_source, plan, status, last_login_at, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.search) {
      const s = data.search.trim();
      q = q.or(`email.ilike.%${s}%,full_name.ilike.%${s}%,hn_user_code.ilike.%${s}%`);
    }
    if (data.source_app) q = q.eq("source_app", data.source_app);
    if (data.status) q = q.eq("status", data.status);
    if (data.plan) q = q.eq("plan", data.plan);

    const { data: rows, error, count } = await q;
    if (error) return { ok: false as const, error: "internal" as const };
    return { ok: true as const, users: rows ?? [], total: count ?? 0 };
  });

export const checkOwnerAccess = createServerFn({ method: "GET" }).handler(async () => {
  const owner = await isOwner();
  return { is_owner: owner.ok };
});
