import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}
function keyHint(raw: string) {
  if (raw.length <= 8) return "****";
  return `${raw.slice(0, 4)}…${raw.slice(-4)}`;
}

export const getMyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [recordsRes, filesRes, logsRes, exportsRes, connRes] = await Promise.all([
      supabase.from("user_records").select("id, type, title, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_files").select("id, name, mime_type, size_bytes, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_activity_logs").select("id, action, metadata, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("dbguard_export_logs").select("id, status, items_count, payload_size, error, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("dbguard_connections").select("project_id, endpoint_url, api_key_hint, status, last_synced_at, updated_at").maybeSingle(),
    ]);
    return {
      userId,
      records: recordsRes.data ?? [],
      files: filesRes.data ?? [],
      logs: logsRes.data ?? [],
      exports: exportsRes.data ?? [],
      connection: connRes.data ?? null,
    };
  });

const recordSchema = z.object({
  type: z.string().min(1).max(64).default("record"),
  title: z.string().min(1).max(255),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const createMyRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => recordSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("user_records")
      .insert({ user_id: userId, type: data.type, title: data.title, data: data.data as never })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("user_activity_logs").insert({ user_id: userId, action: "record.create", metadata: { id: row.id, title: row.title } });
    return row;
  });

export const deleteMyRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("user_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.from("user_activity_logs").insert({ user_id: userId, action: "record.delete", metadata: { id: data.id } });
    return { ok: true };
  });

// Internal sync — this platform IS DB·GUARD. No external endpoint.
// project_id = sync channel label, endpoint_url = optional target HN workspace code (HN-XXXXXX).
const connectionSchema = z.object({
  project_id: z.string().min(1).max(128),
  target_hn_code: z.string().regex(/^HN-\d{6}$/).optional().or(z.literal("")),
});

export const saveDbguardConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => connectionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      project_id: data.project_id,
      endpoint_url: data.target_hn_code || null,
      api_key_hash: null as string | null,
      api_key_hint: null as string | null,
      status: "connected",
      updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabase
      .from("dbguard_connections")
      .upsert(payload, { onConflict: "user_id" })
      .select("project_id, endpoint_url, api_key_hint, status, last_synced_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("user_activity_logs").insert({ user_id: userId, action: "hn.sync.configure", metadata: { project_id: data.project_id, target: data.target_hn_code || null } });
    return row;
  });

export const disconnectDbguard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("dbguard_connections").update({ status: "disconnected", updated_at: new Date().toISOString() }).eq("user_id", userId);
    await supabase.from("user_activity_logs").insert({ user_id: userId, action: "hn.sync.disable", metadata: {} });
    return { ok: true };
  });

// Internal snapshot — no external network call.
export const runDbguardExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ confirm: z.literal(true) }).parse(d))
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const [{ data: records }, { data: files }, { data: logs }, { data: conn }] = await Promise.all([
      supabase.from("user_records").select("id, type, title, data, created_at, updated_at"),
      supabase.from("user_files").select("id, name, mime_type, size_bytes, url, created_at"),
      supabase.from("user_activity_logs").select("id, action, metadata, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("dbguard_connections").select("project_id, endpoint_url, status").maybeSingle(),
    ]);

    const profile = {
      user_id: userId,
      email: (claims as { email?: string })?.email ?? null,
      hn_user_code: (claims as { hn_user_code?: string })?.hn_user_code ?? null,
    };
    const payload = {
      export_id: randomUUID(),
      source_app: "hn-dbguard",
      kind: "internal_snapshot",
      user_id: userId,
      hn_user_code: profile.hn_user_code,
      target_hn_code: conn?.endpoint_url ?? null,
      channel: conn?.project_id ?? null,
      exported_at: new Date().toISOString(),
      data: { profile, records: records ?? [], files: files ?? [], logs: logs ?? [] },
    };
    const json = JSON.stringify(payload);
    const itemsCount = (records?.length ?? 0) + (files?.length ?? 0) + (logs?.length ?? 0);
    const status: "completed" = "completed";

    if (conn?.status === "connected") {
      await supabase.from("dbguard_connections").update({ last_synced_at: new Date().toISOString() }).eq("user_id", userId);
    }
    await supabase.from("dbguard_export_logs").insert({
      user_id: userId, status, items_count: itemsCount, payload_size: json.length, error: null,
    });
    await supabase.from("user_activity_logs").insert({
      user_id: userId, action: "hn.snapshot", metadata: { status, items_count: itemsCount, payload_size: json.length },
    });

    return { status, items_count: itemsCount, payload_size: json.length, payload, error: null as string | null };
  });

