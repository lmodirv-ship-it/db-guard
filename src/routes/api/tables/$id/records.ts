/**
 * /api/tables/$id/records
 *  GET  — list records with optional ?q= search and ?limit ?offset
 *  POST — create record { data: {...} }
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { requireAuth as requireSession } from "@/lib/auth/api-auth.server";
import { getTenantPlan } from "@/lib/platform/plan-limits.server";
import { audit } from "@/lib/audit/log.server";

const CreateRecord = z.object({
  data: z.record(z.string(), z.unknown()),
});

export const Route = createFileRoute("/api/tables/$id/records")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const s = await requireSession(request);
          const url = new URL(request.url);
          const q = url.searchParams.get("q")?.trim() ?? "";
          const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50"), 1), 200);
          const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0"), 0);

          const records = q
            ? await withTenant<{ id: string; data: unknown; created_at: string; updated_at: string }>(s.tid, (sql) => sql`
                SELECT id, data, created_at, updated_at
                FROM db_records
                WHERE tenant_id = ${s.tid} AND table_id = ${params.id}
                  AND data::text ILIKE ${"%" + q + "%"}
                ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
              `)
            : await withTenant<{ id: string; data: unknown; created_at: string; updated_at: string }>(s.tid, (sql) => sql`
                SELECT id, data, created_at, updated_at
                FROM db_records
                WHERE tenant_id = ${s.tid} AND table_id = ${params.id}
                ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
              `);

          const total = await withTenant<{ c: number }>(s.tid, (sql) => sql`
            SELECT count(*)::int AS c FROM db_records WHERE tenant_id = ${s.tid} AND table_id = ${params.id}
          `);
          return jsonOk({ records, total: total[0]?.c ?? 0 });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "list_failed");
        }
      },
      POST: async ({ request, params }) => {
        try {
          const s = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = CreateRecord.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");

          const plan = await getTenantPlan(s.tid);
          const used = await withTenant<{ c: number }>(s.tid, (sql) => sql`
            SELECT count(*)::int AS c FROM db_records WHERE tenant_id = ${s.tid}
          `);
          if ((used[0]?.c ?? 0) >= plan.max_records) {
            return jsonError(402, "plan_limit_records", { limit: plan.max_records });
          }

          const t = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            SELECT id FROM db_tables WHERE tenant_id = ${s.tid} AND id = ${params.id} LIMIT 1
          `);
          if (!t[0]) return jsonError(404, "table_not_found");

          const dataStr = JSON.stringify(parsed.data.data);
          const inserted = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            INSERT INTO db_records (tenant_id, table_id, data)
            VALUES (${s.tid}, ${params.id}, ${dataStr}::jsonb)
            RETURNING id
          `);
          await audit({ action: "record.create", tenantId: s.tid, actorUserId: s.sub, target: inserted[0].id, request });
          return jsonOk({ record: inserted[0] });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("record_create_failed", err);
          return jsonError(500, "create_failed");
        }
      },
    },
  },
});
