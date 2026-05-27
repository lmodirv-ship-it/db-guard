/**
 * Public Data API — used by external HN-GROUPE sites to read/write their
 * records inside DB·GUARD.
 *
 *   Auth:  header `X-HN-Api-Key: dbg_xxxxxxxxxxxx`
 *   URL:   /api/public/v1/data/$collection
 *   Verbs:
 *     GET    ?limit=50&offset=0           → { ok, items: [{ id, data, created_at }] }
 *     POST   body: { data: {...} }        → { ok, id, data, created_at }
 *     DELETE ?id=<uuid>                   → { ok }
 *
 * Collection name must match: ^[a-z][a-z0-9_]{0,62}$
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyApiKey } from "@/lib/platform/verify-api-key.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-HN-Api-Key",
  "Access-Control-Max-Age": "86400",
};

const CollectionParam = z.string().regex(/^[a-z][a-z0-9_]{0,62}$/, "invalid_collection");
const PostBody = z.object({ data: z.record(z.unknown()).default({}) });

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/v1/data/$collection")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request, params }) => {
        const col = CollectionParam.safeParse(params.collection);
        if (!col.success) return json(400, { ok: false, error: "invalid_collection" });

        const key = await verifyApiKey(request.headers.get("x-hn-api-key"));
        if (!key) return json(401, { ok: false, error: "invalid_api_key" });

        const url = new URL(request.url);
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

        const { data, error, count } = await supabaseAdmin
          .from("hn_data_records")
          .select("id, data, created_at, updated_at", { count: "exact" })
          .eq("workspace_id", key.workspace_id)
          .eq("collection", col.data)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) return json(500, { ok: false, error: "read_failed" });
        return json(200, { ok: true, items: data ?? [], total: count ?? 0, limit, offset });
      },

      POST: async ({ request, params }) => {
        const col = CollectionParam.safeParse(params.collection);
        if (!col.success) return json(400, { ok: false, error: "invalid_collection" });

        const key = await verifyApiKey(request.headers.get("x-hn-api-key"));
        if (!key) return json(401, { ok: false, error: "invalid_api_key" });

        let body: unknown;
        try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
        const parsed = PostBody.safeParse(body);
        if (!parsed.success) return json(400, { ok: false, error: "invalid_body" });

        const payload = JSON.stringify(parsed.data.data);
        if (payload.length > 64_000) return json(413, { ok: false, error: "payload_too_large" });

        const { data, error } = await supabaseAdmin
          .from("hn_data_records")
          .insert({
            workspace_id: key.workspace_id,
            collection: col.data,
            data: parsed.data.data,
          })
          .select("id, data, created_at")
          .single();

        if (error || !data) return json(500, { ok: false, error: "write_failed" });
        return json(201, { ok: true, id: data.id, data: data.data, created_at: data.created_at });
      },

      DELETE: async ({ request, params }) => {
        const col = CollectionParam.safeParse(params.collection);
        if (!col.success) return json(400, { ok: false, error: "invalid_collection" });

        const key = await verifyApiKey(request.headers.get("x-hn-api-key"));
        if (!key) return json(401, { ok: false, error: "invalid_api_key" });

        const id = new URL(request.url).searchParams.get("id");
        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json(400, { ok: false, error: "invalid_id" });

        const { error } = await supabaseAdmin
          .from("hn_data_records")
          .delete()
          .eq("workspace_id", key.workspace_id)
          .eq("collection", col.data)
          .eq("id", id);

        if (error) return json(500, { ok: false, error: "delete_failed" });
        return json(200, { ok: true });
      },
    },
  },
});
