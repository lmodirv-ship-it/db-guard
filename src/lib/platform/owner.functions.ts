/**
 * Owner-only server functions.
 * Auth: HN session cookie (hn_session) + role='owner' in Neon users table.
 */
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireHnOwner } from "@/lib/auth/hn-owner-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateApiKey, hashApiKey, keyPrefix } from "@/lib/platform/api-keys.server";
import { ensureOwnerWorkspaceSupabase } from "@/lib/hn/ensure-supabase-workspace.server";


export const listOwnerWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireHnOwner])
  .handler(async () => {
    const { data: ws, error } = await supabaseAdmin
      .from("hn_workspaces")
      .select("id, name, slug, hn_user_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`list_failed: ${error.message}`);
    const ids = Array.from(new Set((ws ?? []).map((w) => w.hn_user_id)));
    const usersRes = ids.length
      ? await supabaseAdmin.from("hn_users").select("id, email, full_name").in("id", ids)
      : { data: [] as Array<{ id: string; email: string; full_name: string }> };
    const byId = new Map((usersRes.data ?? []).map((u) => [u.id, { email: u.email, full_name: u.full_name }]));
    const workspaces = (ws ?? []).map((w) => ({ ...w, hn_users: byId.get(w.hn_user_id) ?? null }));
    return { workspaces };
  });

export const listAllApiKeysForOwner = createServerFn({ method: "GET" })
  .middleware([requireHnOwner])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("hn_api_keys")
      .select("id, label, key_prefix, key_hint, workspace_id, hn_user_id, created_at, last_used_at, revoked_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("list_failed");
    return { keys: data ?? [] };
  });

export const ownerGenerateApiKey = createServerFn({ method: "POST" })
  .middleware([requireHnOwner])
  .inputValidator((d: { workspaceId: string; label?: string }) =>
    z.object({
      workspaceId: z.string().uuid(),
      label: z.string().trim().min(1).max(40).default("owner-generated"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {

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
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("create_failed");
    return { id: row.id, key };
  });

export const ownerRevokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireHnOwner])
  .inputValidator((d: { keyId: string }) =>
    z.object({ keyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await supabaseAdmin
      .from("hn_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.keyId);
    if (error) throw new Error("revoke_failed");
    return { ok: true };
  });

// -------------------- Sites (projects) --------------------

export const listOwnerSites = createServerFn({ method: "GET" })
  .middleware([requireHnOwner])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("hn_sites")
      .select("id, name, site_url, site_host, workspace_id, status, auth_enabled, storage_enabled, data_enabled, verified_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("list_failed");
    return { sites: data ?? [] };
  });

export const ownerAddSite = createServerFn({ method: "POST" })
  .middleware([requireHnOwner])
  .inputValidator((d: { workspaceId: string; name: string; siteUrl: string }) =>
    z.object({
      workspaceId: z.string().uuid(),
      name: z.string().trim().min(1).max(80),
      siteUrl: z.string().trim().url().max(2048),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let host: string;
    try {
      host = new URL(data.siteUrl).hostname.toLowerCase();
    } catch {
      throw new Error("invalid_url");
    }
    const { data: ws } = await supabaseAdmin
      .from("hn_workspaces")
      .select("id, hn_user_id")
      .eq("id", data.workspaceId)
      .maybeSingle();
    if (!ws) throw new Error("workspace_not_found");

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

    // Auto-generate an API key for this new site so the owner gets
    // everything ready to paste immediately.
    const key = generateApiKey();
    const hash = await hashApiKey(key);
    const prefix = keyPrefix(key);
    const hint = `${prefix}…${key.slice(-4)}`;
    await supabaseAdmin.from("hn_api_keys").insert({
      hn_user_id: ws.hn_user_id,
      workspace_id: ws.id,
      label: `${data.name} — auto`,
      key_hash: hash,
      key_prefix: prefix,
      key_hint: hint,
    });

    return { id: row.id, apiKey: key, name: data.name, siteUrl: data.siteUrl };
  });

export const ownerDeleteSite = createServerFn({ method: "POST" })
  .middleware([requireHnOwner])
  .inputValidator((d: { siteId: string }) =>
    z.object({ siteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await supabaseAdmin.from("hn_sites").delete().eq("id", data.siteId);
    if (error) throw new Error("delete_failed");
    return { ok: true };
  });

// -------------------- Site detail / overview --------------------

export const getSiteOverview = createServerFn({ method: "GET" })
  .middleware([requireHnOwner])
  .inputValidator((d: { siteId: string }) =>
    z.object({ siteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {

    const { data: site, error: siteErr } = await supabaseAdmin
      .from("hn_sites")
      .select("id, name, site_url, site_host, workspace_id, status, auth_enabled, storage_enabled, data_enabled, verified_at, created_at")
      .eq("id", data.siteId)
      .maybeSingle();
    if (siteErr || !site) throw new Error("site_not_found");

    const { data: ws } = await supabaseAdmin
      .from("hn_workspaces")
      .select("id, name, slug, hn_user_id")
      .eq("id", site.workspace_id)
      .maybeSingle();

    const { data: keys } = await supabaseAdmin
      .from("hn_api_keys")
      .select("id, label, key_prefix, key_hint, created_at, last_used_at, revoked_at")
      .eq("workspace_id", site.workspace_id)
      .order("created_at", { ascending: false });

    // Auto-detected "tables" = distinct collections used by this workspace
    const { data: recs } = await supabaseAdmin
      .from("hn_data_records")
      .select("collection")
      .eq("workspace_id", site.workspace_id)
      .limit(1000);
    const counts = new Map<string, number>();
    for (const r of recs ?? []) {
      counts.set(r.collection, (counts.get(r.collection) ?? 0) + 1);
    }
    const collections = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const { count: storageCount } = await supabaseAdmin
      .from("hn_storage_objects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", site.workspace_id);

    return {
      site,
      workspace: ws ?? null,
      keys: keys ?? [],
      collections,
      storageCount: storageCount ?? 0,
    };
  });


export const ownerToggleSiteFeature = createServerFn({ method: "POST" })
  .middleware([requireHnOwner])
  .inputValidator((d: { siteId: string; feature: "auth" | "storage" | "data"; enabled: boolean }) =>
    z.object({
      siteId: z.string().uuid(),
      feature: z.enum(["auth", "storage", "data"]),
      enabled: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const patch: { auth_enabled?: boolean; storage_enabled?: boolean; data_enabled?: boolean } = {};
    if (data.feature === "auth") patch.auth_enabled = data.enabled;
    else if (data.feature === "storage") patch.storage_enabled = data.enabled;
    else patch.data_enabled = data.enabled;
    const { error } = await supabaseAdmin
      .from("hn_sites")
      .update(patch)
      .eq("id", data.siteId);
    if (error) throw new Error("update_failed");
    return { ok: true };
  });

