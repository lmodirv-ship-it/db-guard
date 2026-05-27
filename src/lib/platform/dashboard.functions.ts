/**
 * Server functions for the HN-GROUPE data platform:
 *  - listWorkspaces       → workspaces owned by the current user
 *  - createApiKey         → mint a new dbg_… key (returned ONCE in plaintext)
 *  - listApiKeys          → metadata about existing keys (no plaintext)
 *  - revokeApiKey         → soft-revoke a key
 *  - listDataRecords      → records of a given collection in a workspace
 *  - listCollections      → distinct collection names in a workspace
 */
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateApiKey, hashApiKey, keyPrefix } from "@/lib/platform/api-keys.server";

async function resolveHnUser(authUserId: string) {
  const { data, error } = await supabaseAdmin
    .from("hn_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error || !data) throw new Error("hn_user_not_found");
  return data.id as string;
}

async function ensureDefaultWorkspace(hnUserId: string) {
  const { data: existing } = await supabaseAdmin
    .from("hn_workspaces")
    .select("id")
    .eq("hn_user_id", hnUserId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;

  const slug = `ws-${Math.random().toString(36).slice(2, 8)}`;
  const { data: created, error } = await supabaseAdmin
    .from("hn_workspaces")
    .insert({ hn_user_id: hnUserId, name: "Default Workspace", slug })
    .select("id")
    .single();
  if (error || !created) throw new Error("workspace_create_failed");
  return created.id as string;
}

async function assertWorkspaceOwner(workspaceId: string, hnUserId: string) {
  const { data } = await supabaseAdmin
    .from("hn_workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("hn_user_id", hnUserId)
    .maybeSingle();
  if (!data) throw new Error("forbidden");
}

export const listWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await ensureDefaultWorkspace(hnUserId);
    const { data } = await supabaseAdmin
      .from("hn_workspaces")
      .select("id, name, slug, created_at")
      .eq("hn_user_id", hnUserId)
      .order("created_at", { ascending: true });
    return { workspaces: data ?? [] };
  });

export const listCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string }) =>
    z.object({ workspaceId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await assertWorkspaceOwner(data.workspaceId, hnUserId);

    const { data: rows } = await supabaseAdmin
      .from("hn_data_records")
      .select("collection")
      .eq("workspace_id", data.workspaceId);
    const counts = new Map<string, number>();
    for (const r of rows ?? []) counts.set(r.collection, (counts.get(r.collection) ?? 0) + 1);
    return { collections: [...counts.entries()].map(([name, count]) => ({ name, count })) };
  });

export const listDataRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; collection?: string; limit?: number }) =>
    z.object({
      workspaceId: z.string().uuid(),
      collection: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/).optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await assertWorkspaceOwner(data.workspaceId, hnUserId);

    let q = supabaseAdmin
      .from("hn_data_records")
      .select("id, collection, data, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.collection) q = q.eq("collection", data.collection);

    const { data: rows, error } = await q;
    if (error) throw new Error("read_failed");
    return { records: rows ?? [] };
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const hnUserId = await resolveHnUser(context.userId);
    const { data } = await supabaseAdmin
      .from("hn_api_keys")
      .select("id, label, key_prefix, key_hint, workspace_id, created_at, last_used_at, revoked_at")
      .eq("hn_user_id", hnUserId)
      .order("created_at", { ascending: false });
    return { keys: data ?? [] };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; label?: string }) =>
    z.object({
      workspaceId: z.string().uuid(),
      label: z.string().trim().min(1).max(40).default("default"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await assertWorkspaceOwner(data.workspaceId, hnUserId);

    const key = generateApiKey();
    const hash = await hashApiKey(key);
    const prefix = keyPrefix(key);
    const hint = `${prefix}…${key.slice(-4)}`;

    const { data: row, error } = await supabaseAdmin
      .from("hn_api_keys")
      .insert({
        hn_user_id: hnUserId,
        workspace_id: data.workspaceId,
        label: data.label,
        key_hash: hash,
        key_prefix: prefix,
        key_hint: hint,
      })
      .select("id, label, key_prefix, key_hint, created_at")
      .single();
    if (error || !row) throw new Error("key_create_failed");

    return { key, meta: row };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { keyId: string }) =>
    z.object({ keyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    const { error } = await supabaseAdmin
      .from("hn_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.keyId)
      .eq("hn_user_id", hnUserId);
    if (error) throw new Error("revoke_failed");
    return { ok: true };
  });
