import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildObjectKey, putStorageObject, removeStorageObject } from "@/lib/platform/storage.server";

function randomKey(prefix: string, len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = prefix;
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

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

async function assertSiteOwner(siteId: string, hnUserId: string) {
  const { data } = await supabaseAdmin
    .from("hn_sites")
    .select("id, workspace_id, hn_workspaces!inner(hn_user_id)")
    .eq("id", siteId)
    .eq("hn_workspaces.hn_user_id", hnUserId)
    .maybeSingle();
  if (!data) throw new Error("forbidden");
  return data.workspace_id as string;
}

function parseSite(url: string) {
  const u = new URL(url.trim());
  return {
    site_url: u.origin,
    site_host: u.hostname.toLowerCase(),
    name: u.hostname.replace(/^www\./, ""),
  };
}

export const listSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string }) =>
    z.object({ workspaceId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await ensureDefaultWorkspace(hnUserId);
    await assertWorkspaceOwner(data.workspaceId, hnUserId);

    const { data: rows, error } = await supabaseAdmin
      .from("hn_sites")
      .select("id, name, site_url, site_host, status, auth_enabled, storage_enabled, data_enabled, sso_app_key, storage_scope, verified_at, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("sites_read_failed");
    return { sites: rows ?? [] };
  });

export const registerSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; url: string; name?: string }) =>
    z.object({
      workspaceId: z.string().uuid(),
      url: z.string().url().max(500),
      name: z.string().trim().min(2).max(80).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await assertWorkspaceOwner(data.workspaceId, hnUserId);
    const parsed = parseSite(data.url);

    const { data: row, error } = await supabaseAdmin
      .from("hn_sites")
      .upsert({
        workspace_id: data.workspaceId,
        name: data.name?.trim() || parsed.name,
        site_url: parsed.site_url,
        site_host: parsed.site_host,
        status: "active",
        verified_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,site_url" })
      .select("id, name, site_url, site_host, status, auth_enabled, storage_enabled, data_enabled, sso_app_key, storage_scope, verified_at, created_at")
      .single();

    if (error || !row) throw new Error("site_register_failed");
    return { site: row };
  });

export const enableSiteAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteId: string }) => z.object({ siteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await assertSiteOwner(data.siteId, hnUserId);

    const { data: existing } = await supabaseAdmin
      .from("hn_sites")
      .select("sso_app_key")
      .eq("id", data.siteId)
      .single();

    const ssoAppKey = existing?.sso_app_key || randomKey("hnsso_");
    const { data: row, error } = await supabaseAdmin
      .from("hn_sites")
      .update({ auth_enabled: true, sso_app_key: ssoAppKey })
      .eq("id", data.siteId)
      .select("id, sso_app_key, auth_enabled")
      .single();

    if (error || !row) throw new Error("site_auth_enable_failed");
    return { site: row };
  });

export const enableSiteStorage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteId: string; scope?: "private" | "public" }) =>
    z.object({
      siteId: z.string().uuid(),
      scope: z.enum(["private", "public"]).default("private"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await assertSiteOwner(data.siteId, hnUserId);

    const { data: row, error } = await supabaseAdmin
      .from("hn_sites")
      .update({ storage_enabled: true, storage_scope: data.scope })
      .eq("id", data.siteId)
      .select("id, storage_enabled, storage_scope")
      .single();

    if (error || !row) throw new Error("site_storage_enable_failed");
    return { site: row };
  });

export const listStorageObjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; siteId?: string; limit?: number }) =>
    z.object({
      workspaceId: z.string().uuid(),
      siteId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await assertWorkspaceOwner(data.workspaceId, hnUserId);

    let query = supabaseAdmin
      .from("hn_storage_objects")
      .select("id, site_id, object_key, file_name, content_type, size_bytes, visibility, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.siteId) query = query.eq("site_id", data.siteId);

    const { data: rows, error } = await query;
    if (error) throw new Error("storage_objects_read_failed");
    return { objects: rows ?? [] };
  });

function decodeBase64(input: string): ArrayBuffer {
  const bin = atob(input);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export const uploadStorageObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    workspaceId: string;
    fileName: string;
    contentType?: string;
    dataBase64: string;
    siteId?: string;
    visibility?: "private" | "public";
  }) =>
    z.object({
      workspaceId: z.string().uuid(),
      fileName: z.string().trim().min(1).max(180),
      contentType: z.string().trim().min(1).max(120).optional(),
      dataBase64: z.string().min(1).max(15_000_000),
      siteId: z.string().uuid().optional(),
      visibility: z.enum(["private", "public"]).default("private"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await assertWorkspaceOwner(data.workspaceId, hnUserId);

    let siteHost: string | null = null;
    if (data.siteId) {
      const { data: site } = await supabaseAdmin
        .from("hn_sites")
        .select("site_host, workspace_id")
        .eq("id", data.siteId)
        .maybeSingle();
      if (!site || site.workspace_id !== data.workspaceId) throw new Error("site_not_found");
      siteHost = site.site_host;
    }

    const objectKey = buildObjectKey(data.workspaceId, data.fileName, siteHost);
    const body = decodeBase64(data.dataBase64);
    await putStorageObject(objectKey, body, data.contentType);

    const { data: row, error } = await supabaseAdmin
      .from("hn_storage_objects")
      .insert({
        workspace_id: data.workspaceId,
        site_id: data.siteId ?? null,
        uploaded_by_hn_user_id: hnUserId,
        object_key: objectKey,
        file_name: data.fileName,
        content_type: data.contentType ?? null,
        size_bytes: body.byteLength,
        visibility: data.visibility,
      })
      .select("id, object_key, file_name, size_bytes, visibility, created_at")
      .single();

    if (error || !row) {
      await removeStorageObject(objectKey).catch(() => {});
      throw new Error("storage_write_failed");
    }
    return { object: row };
  });

export const deleteStorageObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { objectId: string }) =>
    z.object({ objectId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    const { data: row } = await supabaseAdmin
      .from("hn_storage_objects")
      .select("id, object_key, workspace_id, hn_workspaces!inner(hn_user_id)")
      .eq("id", data.objectId)
      .eq("hn_workspaces.hn_user_id", hnUserId)
      .maybeSingle();
    if (!row) throw new Error("forbidden");

    await removeStorageObject(row.object_key).catch(() => {});
    await supabaseAdmin.from("hn_storage_objects").delete().eq("id", row.id);
    return { ok: true };
  });

export const deleteSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteId: string }) =>
    z.object({ siteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const hnUserId = await resolveHnUser(context.userId);
    await assertSiteOwner(data.siteId, hnUserId);
    await supabaseAdmin.from("hn_sites").delete().eq("id", data.siteId);
    return { ok: true };
  });

export const listHnUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    // Only owners see all SSO users; others see just themselves.
    const { data: ownerRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "owner")
      .maybeSingle();
    const isOwner = !!ownerRow;

    let q = supabaseAdmin
      .from("hn_users")
      .select("id, hn_user_code, full_name, email, phone, source_app, plan, status, email_verified, last_login_at, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (!isOwner) q = q.eq("auth_user_id", context.userId);

    const { data: rows, error } = await q;
    if (error) throw new Error("users_read_failed");
    return { users: rows ?? [], isOwner };
  });
