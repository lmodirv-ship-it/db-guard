/**
 * HN.db — update/delete a single record.
 *   PATCH  /api/hn/db/:collection/:id   { data: {...} }   (merge)
 *   DELETE /api/hn/db/:collection/:id
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireHnAccess, hnAccessErrorResponse } from "@/lib/hn/access.server";
import {
  getOrCreateCollection, isCollectionName, updateRecord, deleteRecord,
} from "@/lib/hn/db.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-HN-Token, Content-Type, X-HN-Site",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

export const Route = createFileRoute("/api/hn/db/$collection/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      PATCH: async ({ request, params }) => {
        try {
          const ctx = await requireHnAccess(request, "db.write");
          const name = String(params.collection || "").toLowerCase();
          if (!isCollectionName(name)) return json(400, { ok: false, error: "invalid_collection" });
          let body: { data?: Record<string, unknown> } = {};
          try { body = await request.json() as typeof body; } catch { return json(400, { ok: false, error: "invalid_json" }); }
          const data = body.data ?? {};
          if (typeof data !== "object" || Array.isArray(data)) {
            return json(400, { ok: false, error: "data_must_be_object" });
          }
          const col = await getOrCreateCollection(ctx.tenantId, name);
          const rec = await updateRecord(ctx.tenantId, col.id, params.id, data);
          if (!rec) return json(404, { ok: false, error: "not_found" });
          return json(200, { ok: true, record: rec });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const ctx = await requireHnAccess(request, "db.delete");
          const name = String(params.collection || "").toLowerCase();
          if (!isCollectionName(name)) return json(400, { ok: false, error: "invalid_collection" });
          const col = await getOrCreateCollection(ctx.tenantId, name);
          const ok = await deleteRecord(ctx.tenantId, col.id, params.id);
          if (!ok) return json(404, { ok: false, error: "not_found" });
          return json(200, { ok: true, deleted: true });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },
    },
  },
});
