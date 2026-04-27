import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";

const ImportSchema = z.object({
  entity: z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/),
  records: z
    .array(
      z.object({
        externalId: z.string().min(1).max(255).optional(),
        data: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1)
    .max(1000),
});

export const Route = createFileRoute("/api/projects/$id/import")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const session = await requireSession(request);
          const id = params.id;
          if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "invalid_id");

          const body = await request.json().catch(() => null);
          const parsed = ImportSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input", { issues: parsed.error.issues });

          const proj = await withTenant<{ id: string; verified_at: string | null }>(
            session.tid,
            (sql) => sql`
              SELECT id, verified_at FROM projects
              WHERE tenant_id = ${session.tid} AND id = ${id}
              LIMIT 1
            `,
          );
          if (proj.length === 0) return jsonError(404, "not_found");
          if (!proj[0].verified_at) return jsonError(412, "not_verified");

          let inserted = 0;
          let updated = 0;
          for (const rec of parsed.data.records) {
            const externalId = rec.externalId ?? null;
            const dataJson = JSON.stringify(rec.data);
            if (externalId) {
              const r = await withTenant<{ inserted: boolean }>(session.tid, (sql) => sql`
                INSERT INTO records (tenant_id, project_id, entity, external_id, data)
                VALUES (${session.tid}, ${id}, ${parsed.data.entity}, ${externalId}, ${dataJson}::jsonb)
                ON CONFLICT (tenant_id, project_id, entity, external_id)
                  WHERE external_id IS NOT NULL
                DO UPDATE SET data = EXCLUDED.data, updated_at = now()
                RETURNING (xmax = 0) AS inserted
              `);
              if (r[0]?.inserted) inserted++;
              else updated++;
            } else {
              await withTenant(session.tid, (sql) => sql`
                INSERT INTO records (tenant_id, project_id, entity, data)
                VALUES (${session.tid}, ${id}, ${parsed.data.entity}, ${dataJson}::jsonb)
              `);
              inserted++;
            }
          }

          await withTenant(session.tid, (sql) => sql`
            UPDATE projects SET status = 'completed', error_message = NULL
            WHERE tenant_id = ${session.tid} AND id = ${id}
          `);

          return jsonOk({ entity: parsed.data.entity, inserted, updated });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("project_import_failed", err);
          return jsonError(500, "import_failed");
        }
      },
    },
  },
});
