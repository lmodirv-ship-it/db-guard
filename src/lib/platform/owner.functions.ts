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

// -------------------- Sites (projects) --------------------

export const listOwnerSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);
    const { data, error } = await supabaseAdmin
      .from("hn_sites")
      .select("id, name, site_url, site_host, workspace_id, status, auth_enabled, storage_enabled, data_enabled, verified_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("list_failed");
    return { sites: data ?? [] };
  });

export const ownerAddSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; name: string; siteUrl: string }) =>
    z.object({
      workspaceId: z.string().uuid(),
      name: z.string().trim().min(1).max(80),
      siteUrl: z.string().trim().url().max(2048),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    let host: string;
    try {
      host = new URL(data.siteUrl).hostname.toLowerCase();
    } catch {
      throw new Error("invalid_url");
    }
    const { data: row, error } = await supabaseAdmin
      .from("hn_sites")
      .insert({
        workspace_id: data.workspaceId,
        name: data.name,
        site_url: data.siteUrl,
        site_host: host,
        verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "create_failed");
    return { id: row.id };
  });

export const ownerDeleteSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteId: string }) =>
    z.object({ siteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { error } = await supabaseAdmin.from("hn_sites").delete().eq("id", data.siteId);
    if (error) throw new Error("delete_failed");
    return { ok: true };
  });

export const ownerToggleSiteFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteId: string; feature: "auth" | "storage" | "data"; enabled: boolean }) =>
    z.object({
      siteId: z.string().uuid(),
      feature: z.enum(["auth", "storage", "data"]),
      enabled: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const col = `${data.feature}_enabled` as "auth_enabled" | "storage_enabled" | "data_enabled";
    const { error } = await supabaseAdmin
      .from("hn_sites")
      .update({ [col]: data.enabled })
      .eq("id", data.siteId);
    if (error) throw new Error("update_failed");
    return { ok: true };
  });

