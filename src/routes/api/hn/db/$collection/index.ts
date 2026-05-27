/**
 * HN.db — list/insert into a collection.
 *   GET  /api/hn/db/:collection?limit=50&offset=0
 *   POST /api/hn/db/:collection   { data: {...} }
 *
 * Auth: HN bearer token (Authorization: Bearer hns_…)
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireHnAccess, hnAccessErrorResponse } from "@/lib/hn/access.server";
import {
  getOrCreateCollection, isCollectionName, listRecords, insertRecord,
} from "@/lib/hn/db.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-HN-Token, Content-Type, X-HN-Site",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

export const Route = createFileRoute("/api/hn/db/$collection/")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request, params }) => {
        try {
          const ctx = await requireHnAccess(request, "db.read");
          const name = String(params.collection || "").toLowerCase();
          if (!isCollectionName(name)) return json(400, { ok: false, error: "invalid_collection" });
          const col = await getOrCreateCollection(ctx.tenantId, name);
          const url = new URL(request.url);
          const limit = Number(url.searchParams.get("limit") || 50);
          const offset = Number(url.searchParams.get("offset") || 0);
          const rows = await listRecords(ctx.tenantId, col.id, { limit, offset });
          return json(200, { ok: true, collection: col.name, records: rows });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },

      POST: async ({ request, params }) => {
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
          const rec = await insertRecord(ctx.tenantId, col.id, data);
          return json(200, { ok: true, record: rec });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },
    },
  },
});
