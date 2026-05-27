/**
 * Owner-only server functions.
 */
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateApiKey, hashApiKey, keyPrefix } from "@/lib/platform/api-keys.server";

async function assertOwner(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("forbidden");
}

export const listOwnerWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);
    const { data, error } = await supabaseAdmin
      .from("hn_workspaces")
      .select("id, name, slug, hn_user_id, created_at, hn_users(email, full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error("list_failed");
    return { workspaces: data ?? [] };
  });

export const listAllApiKeysForOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);
    const { data, error } = await supabaseAdmin
      .from("hn_api_keys")
      .select("id, label, key_prefix, key_hint, full_key, workspace_id, hn_user_id, created_at, last_used_at, revoked_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("list_failed");
    return { keys: data ?? [] };
  });

export const ownerGenerateApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; label?: string }) =>
    z.object({
      workspaceId: z.string().uuid(),
      label: z.string().trim().min(1).max(40).default("owner-generated"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);

    const { data: ws } = await supabaseAdmin
      .from("hn_workspaces")
      .select("id, hn_user_id")
      .eq("id", data.workspaceId)
      .maybeSingle();
    if (!ws) throw new Error("workspace_not_found");

    const key = generateApiKey();
    const hash = await hashApiKey(key);
    const prefix = keyPrefix(key);
    const hint = `${prefix}…${key.slice(-4)}`;

    const { data: row, error } = await supabaseAdmin
      .from("hn_api_keys")
      .insert({
        hn_user_id: ws.hn_user_id,
        workspace_id: ws.id,
        label: data.label,
        key_hash: hash,
        key_prefix: prefix,
        key_hint: hint,
        full_key: key,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("create_failed");
    return { id: row.id, key };
  });

export const ownerRevokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { keyId: string }) =>
    z.object({ keyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { error } = await supabaseAdmin
      .from("hn_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.keyId);
    if (error) throw new Error("revoke_failed");
    return { ok: true };
  });
