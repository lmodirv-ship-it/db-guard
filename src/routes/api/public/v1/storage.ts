import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyApiKey } from "@/lib/platform/verify-api-key.server";
import { buildObjectKey, putStorageObject, removeStorageObject } from "@/lib/platform/storage.server";
import { withApiLog } from "@/lib/platform/api-log.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-HN-Api-Key",
  "Access-Control-Max-Age": "86400",
};

const UploadBody = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.string().trim().min(1).max(120).optional(),
  dataBase64: z.string().min(1).max(10_000_000),
  siteId: z.string().uuid().optional(),
  siteHost: z.string().regex(/^[a-z0-9.-]+$/i).optional(),
  visibility: z.enum(["private", "public"]).default("private"),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function decodeBase64(input: string) {
  const bin = atob(input);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function resolveSite(workspaceId: string, siteId?: string, siteHost?: string) {
  if (!siteId && !siteHost) return null;
  let query = supabaseAdmin
    .from("hn_sites")
    .select("id, site_host, storage_enabled")
    .eq("workspace_id", workspaceId);

  if (siteId) query = query.eq("id", siteId);
  if (siteHost) query = query.eq("site_host", siteHost.toLowerCase());

  const { data } = await query.maybeSingle();
  if (!data || !data.storage_enabled) throw new Error("storage_not_enabled_for_site");
  return data;
}

export const Route = createFileRoute("/api/public/v1/storage")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: withApiLog(async ({ request }) => {
        const key = await verifyApiKey(request.headers.get("x-hn-api-key"));
        if (!key) return json(401, { ok: false, error: "invalid_api_key" });

        const url = new URL(request.url);
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
        const siteHost = url.searchParams.get("siteHost")?.toLowerCase() || undefined;

        let siteId: string | undefined;
        if (siteHost) {
          const site = await resolveSite(key.workspace_id, undefined, siteHost).catch(() => null);
          if (!site) return json(404, { ok: false, error: "site_not_found" });
          siteId = site.id;
        }

        let query = supabaseAdmin
          .from("hn_storage_objects")
          .select("id, site_id, object_key, file_name, content_type, size_bytes, visibility, created_at")
          .eq("workspace_id", key.workspace_id)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (siteId) query = query.eq("site_id", siteId);

        const { data, error } = await query;
        if (error) return json(500, { ok: false, error: "storage_list_failed" });

        return json(200, {
          ok: true,
          items: (data ?? []).map((item) => ({
            ...item,
            url: `/api/public/v1/storage/file?key=${encodeURIComponent(item.object_key)}`,
          })),
        });
      }),
      POST: withApiLog(async ({ request }) => {
        const key = await verifyApiKey(request.headers.get("x-hn-api-key"));
        if (!key) return json(401, { ok: false, error: "invalid_api_key" });

        let body: unknown;
        try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
        const parsed = UploadBody.safeParse(body);
        if (!parsed.success) return json(400, { ok: false, error: "invalid_body" });

        try {
          const site = await resolveSite(key.workspace_id, parsed.data.siteId, parsed.data.siteHost);
          const objectKey = buildObjectKey(key.workspace_id, parsed.data.fileName, site?.site_host ?? null);
          const bytes = decodeBase64(parsed.data.dataBase64);
          const sizeBytes = bytes.byteLength;
          if (sizeBytes > 5 * 1024 * 1024) return json(413, { ok: false, error: "file_too_large" });

          await putStorageObject(objectKey, bytes, parsed.data.contentType);

          const { data, error } = await supabaseAdmin
            .from("hn_storage_objects")
            .insert({
              workspace_id: key.workspace_id,
              site_id: site?.id ?? null,
              object_key: objectKey,
              file_name: parsed.data.fileName,
              content_type: parsed.data.contentType ?? null,
              size_bytes: sizeBytes,
              visibility: parsed.data.visibility,
              uploaded_by_hn_user_id: key.hn_user_id,
            })
            .select("id, object_key, file_name, content_type, size_bytes, visibility, created_at")
            .single();

          if (error || !data) return json(500, { ok: false, error: "storage_write_failed" });
          return json(201, {
            ok: true,
            file: {
              ...data,
              url: `/api/public/v1/storage/file?key=${encodeURIComponent(data.object_key)}`,
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "storage_upload_failed";
          const code = msg === "storage_not_enabled_for_site" ? 400 : 500;
          return json(code, { ok: false, error: msg });
        }
      }),
      DELETE: withApiLog(async ({ request }) => {
        const key = await verifyApiKey(request.headers.get("x-hn-api-key"));
        if (!key) return json(401, { ok: false, error: "invalid_api_key" });

        const objectKey = new URL(request.url).searchParams.get("key");
        if (!objectKey) return json(400, { ok: false, error: "missing_key" });

        const { data: row } = await supabaseAdmin
          .from("hn_storage_objects")
          .select("object_key")
          .eq("workspace_id", key.workspace_id)
          .eq("object_key", objectKey)
          .maybeSingle();
        if (!row) return json(404, { ok: false, error: "not_found" });

        await removeStorageObject(objectKey).catch(() => null);
        const { error } = await supabaseAdmin
          .from("hn_storage_objects")
          .delete()
          .eq("workspace_id", key.workspace_id)
          .eq("object_key", objectKey);
        if (error) return json(500, { ok: false, error: "storage_delete_failed" });
        return json(200, { ok: true });
      }),
    },
  },
});
