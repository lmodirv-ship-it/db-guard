import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyApiKey } from "@/lib/platform/verify-api-key.server";
import { getStorageObject } from "@/lib/platform/storage.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-HN-Api-Key",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/public/v1/storage/file")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const objectKey = new URL(request.url).searchParams.get("key");
        if (!objectKey) {
          return new Response(JSON.stringify({ ok: false, error: "missing_key" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }

        const { data: row } = await supabaseAdmin
          .from("hn_storage_objects")
          .select("workspace_id, object_key, content_type, file_name, visibility")
          .eq("object_key", objectKey)
          .maybeSingle();
        if (!row) {
          return new Response("Not found", { status: 404, headers: CORS });
        }

        if (row.visibility !== "public") {
          const key = await verifyApiKey(request.headers.get("x-hn-api-key"));
          if (!key || key.workspace_id !== row.workspace_id) {
            return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
              status: 401,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
        }

        const obj = await getStorageObject(row.object_key);
        if (!obj) return new Response("Not found", { status: 404, headers: CORS });

        return new Response(obj.body, {
          status: 200,
          headers: {
            ...CORS,
            "Content-Type": row.content_type || obj.httpMetadata?.contentType || "application/octet-stream",
            "Content-Disposition": `inline; filename="${row.file_name}"`,
            "Cache-Control": row.visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
          },
        });
      },
    },
  },
});
