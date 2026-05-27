/**
 * HN.storage — tenant-scoped file storage on R2.
 *   GET    /api/hn/storage?limit=50   → list
 *   POST   /api/hn/storage            → upload  { fileName, contentType, dataBase64 }
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireHnAccess, hnAccessErrorResponse } from "@/lib/hn/access.server";
import { getR2 } from "@/lib/cf-bindings.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-HN-Token, Content-Type, X-HN-Site",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

function tenantPrefix(tenantId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) throw new Error("bad_tenant");
  return `t/${tenantId}/hn/`;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function safeFileName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
}

export const Route = createFileRoute("/api/hn/storage/")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        try {
          const ctx = await requireHnAccess(request, "storage.read");
          const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") || 50), 500);
          const r2 = await getR2();
          const out = await r2.list({ prefix: tenantPrefix(ctx.tenantId), limit });
          return json(200, {
            ok: true,
            files: out.objects.map((o) => ({
              key: o.key,
              id: o.key.split("/").slice(-1)[0],
              size: o.size,
              uploaded: o.uploaded,
            })),
          });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },

      POST: async ({ request }) => {
        try {
          const ctx = await requireHnAccess(request, "storage.upload");
          let body: { fileName?: string; contentType?: string; dataBase64?: string } = {};
          try { body = await request.json() as typeof body; } catch { return json(400, { ok: false, error: "invalid_json" }); }
          if (!body.dataBase64) return json(400, { ok: false, error: "missing_data" });
          const bytes = b64ToBytes(body.dataBase64);
          if (bytes.byteLength > 25 * 1024 * 1024) return json(413, { ok: false, error: "file_too_large" });

          const id = crypto.randomUUID();
          const fileName = safeFileName(body.fileName || "file");
          const key = `${tenantPrefix(ctx.tenantId)}${id}-${fileName}`;
          const ct = body.contentType || "application/octet-stream";
          const r2 = await getR2();
          await r2.put(key, bytes.buffer, { httpMetadata: { contentType: ct } });
          return json(200, {
            ok: true,
            file: { id, key, size: bytes.byteLength, contentType: ct, fileName },
          });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },
    },
  },
});
