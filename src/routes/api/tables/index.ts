/**
 * /api/tables
 *  GET  — list all tables in default workspace (with column counts)
 *  POST — create a new table { name, description?, columns?: [{name,data_type,is_required?}] }
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { requireAuth as requireSession } from "@/lib/auth/api-auth.server";
import { getTenantPlan } from "@/lib/platform/plan-limits.server";
import { audit } from "@/lib/audit/log.server";

const TABLE_NAME_RE = /^[a-z][a-z0-9_]{0,62}$/i;

const ColSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/i),
  data_type: z.enum(["text", "number", "boolean", "date", "datetime", "json", "email", "url"]).default("text"),
  is_required: z.boolean().optional(),
});
const CreateSchema = z.object({
  name: z.string().regex(TABLE_NAME_RE).max(63),
  description: z.string().max(500).optional(),
  columns: z.array(ColSchema).max(50).optional(),
});

export const Route = createFileRoute("/api/tables/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const s = await requireSession(request);
          const rows = await withTenant<{
            id: string; name: string; description: string | null;
            is_system: boolean; icon: string | null;
            created_at: string; column_count: number; record_count: number;
          }>(s.tid, (sql) => sql`
            SELECT t.id, t.name, t.description, t.is_system, t.icon, t.created_at,
              (SELECT count(*)::int FROM db_columns c WHERE c.table_id = t.id) AS column_count,
              (SELECT count(*)::int FROM db_records r WHERE r.table_id = t.id) AS record_count
            FROM db_tables t
            WHERE t.tenant_id = ${s.tid}
            ORDER BY t.is_system DESC, t.created_at ASC
          `);
          return jsonOk({ tables: rows });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("tables_list_failed", err);
          return jsonError(500, "list_failed");
        }
      },
      POST: async ({ request }) => {
        try {
          const s = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = CreateSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input", { issues: parsed.error.issues });

          // Plan limit
          const plan = await getTenantPlan(s.tid);
          const counts = await withTenant<{ c: number }>(s.tid, (sql) => sql`
            SELECT count(*)::int AS c FROM db_tables WHERE tenant_id = ${s.tid}
          `);
          if ((counts[0]?.c ?? 0) >= plan.max_tables) {
            return jsonError(402, "plan_limit_tables", { limit: plan.max_tables });
          }

          // default workspace
          const ws = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            SELECT id FROM workspaces WHERE tenant_id = ${s.tid} AND is_default = TRUE LIMIT 1
          `);
          if (!ws[0]) return jsonError(500, "workspace_missing");

          const created = await withTenant<{ id: string; name: string }>(s.tid, (sql) => sql`
            INSERT INTO db_tables (tenant_id, workspace_id, name, description)
            VALUES (${s.tid}, ${ws[0].id}, ${parsed.data.name}, ${parsed.data.description ?? null})
            RETURNING id, name
          `);
          const t = created[0];

          if (parsed.data.columns?.length) {
            for (let i = 0; i < parsed.data.columns.length; i++) {
              const col = parsed.data.columns[i];
              await withTenant(s.tid, (sql) => sql`
                INSERT INTO db_columns (tenant_id, table_id, name, data_type, is_required, position)
                VALUES (${s.tid}, ${t.id}, ${col.name}, ${col.data_type}, ${col.is_required ?? false}, ${i})
              `);
            }
          }

          await audit({
            action: "table.create", tenantId: s.tid, actorUserId: s.sub, actorEmail: s.email,
            target: t.id, meta: { name: t.name }, request,
          });
          return jsonOk({ table: t });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("table_create_failed", err);
          return jsonError(500, "create_failed");
        }
      },
    },
  },
});
