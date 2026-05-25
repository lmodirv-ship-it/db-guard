/**
 * /api/backups
 *  GET  — list backups (no snapshot data)
 *  POST — create snapshot of all db_records { label }
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { getTenantPlan } from "@/lib/platform/plan-limits.server";
import { audit } from "@/lib/audit/log.server";

const CreateSchema = z.object({
  label: z.string().min(1).max(120),
});

export const Route = createFileRoute("/api/backups/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const s = await requireSession(request);
          const rows = await withTenant<{
            id: string; label: string; size_bytes: number; created_at: string;
          }>(s.tid, (sql) => sql`
            SELECT id, label, size_bytes, created_at
            FROM backups WHERE tenant_id = ${s.tid} ORDER BY created_at DESC LIMIT 100
          `);
          return jsonOk({ backups: rows });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "list_failed");
        }
      },
      POST: async ({ request }) => {
        try {
          const s = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = CreateSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");

          const plan = await getTenantPlan(s.tid);
          if (!plan.has_backups) return jsonError(402, "plan_no_backups");

          // Build snapshot
          const tables = await withTenant<{ id: string; name: string }>(s.tid, (sql) => sql`
            SELECT id, name FROM db_tables WHERE tenant_id = ${s.tid}
          `);
          const snapshot: Array<{ id: string; name: string; records: unknown[] }> = [];
          let totalSize = 0;
          for (const t of tables) {
            const recs = await withTenant<{ id: string; data: unknown }>(s.tid, (sql) => sql`
              SELECT id, data FROM db_records WHERE tenant_id = ${s.tid} AND table_id = ${t.id}
            `);
            snapshot.push({ id: t.id, name: t.name, records: recs });
          }
          const json = JSON.stringify({ tables: snapshot });
          totalSize = json.length;

          const r = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            INSERT INTO backups (tenant_id, created_by, label, snapshot, size_bytes)
            VALUES (${s.tid}, ${s.sub}, ${parsed.data.label}, ${json}::jsonb, ${totalSize})
            RETURNING id
          `);
          await audit({ action: "backup.create", tenantId: s.tid, actorUserId: s.sub, target: r[0].id, meta: { size: totalSize }, request });
          return jsonOk({ backup: r[0] });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("backup_create_failed", err);
          return jsonError(500, "create_failed");
        }
      },
    },
  },
});
