/**
 * HN.storage — fetch or delete a file by id.
 *   GET    /api/hn/storage/:id  (no auth — but key is unguessable UUID under tenant prefix)
 *   DELETE /api/hn/storage/:id  (requires storage.delete)
 *
 * Note: GET requires the full key via ?key=… because R2 needs the full object key.
 *       The SDK builds it as `${tenantPrefix}${id}` from the upload response.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireHnAccess, hnAccessErrorResponse } from "@/lib/hn/access.server";
import { getR2 } from "@/lib/cf-bindings.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-HN-Token",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

function tenantPrefix(tenantId: string): string {
  return `t/${tenantId}/hn/`;
}

async function findKeyForId(tenantId: string, id: string): Promise<string | null> {
  const r2 = await getR2();
  const out = await r2.list({ prefix: `${tenantPrefix(tenantId)}${id}-`, limit: 1 });
  return out.objects[0]?.key ?? null;
}

export const Route = createFileRoute("/api/hn/storage/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request, params }) => {
        try {
          const ctx = await requireHnAccess(request, "storage.read");
          const key = await findKeyForId(ctx.tenantId, params.id);
          if (!key) return json(404, { ok: false, error: "not_found" });
          const r2 = await getR2();
          const obj = await r2.get(key);
          if (!obj) return json(404, { ok: false, error: "not_found" });
          return new Response(obj.body, {
            status: 200,
            headers: {
              "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
              "Cache-Control": "private, max-age=300",
              ...CORS,
            },
          });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const ctx = await requireHnAccess(request, "storage.delete");
          const key = await findKeyForId(ctx.tenantId, params.id);
          if (!key) return json(404, { ok: false, error: "not_found" });
          const r2 = await getR2();
          await r2.delete(key);
          return json(200, { ok: true, deleted: true });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },
    },
  },
});
