/**
 * GET  /api/jobs              — list current tenant's jobs (latest 100).
 * POST /api/jobs              — enqueue a job: { projectId, kind }.
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import {
  requireSession,
  jsonError,
  jsonOk,
  AuthError,
} from "@/lib/auth/session.server";
import { withTenant } from "@/lib/db/tenant.server";
import { enqueue, type JobKind } from "@/lib/queue/queue.server";

const EnqueueSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(["verify", "analyze", "generate_schema", "import", "full_pipeline"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/jobs/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireSession(request);
          const rows = await withTenant<{
            id: string;
            project_id: string;
            kind: string;
            status: string;
            attempts: number;
            max_attempts: number;
            last_error: string | null;
            scheduled_at: string;
            created_at: string;
          }>(session.tid, (sql) => sql`
            SELECT id, project_id, kind, status, attempts, max_attempts,
                   last_error, scheduled_at, created_at
              FROM jobs
             WHERE tenant_id = ${session.tid}
             ORDER BY created_at DESC
             LIMIT 100
          `);
          return jsonOk({ jobs: rows });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("jobs_list_failed", err);
          return jsonError(500, "list_failed");
        }
      },

      POST: async ({ request }) => {
        try {
          const session = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = EnqueueSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");

          // Verify project belongs to this tenant (RLS-guarded SELECT).
          const proj = await withTenant<{ id: string }>(session.tid, (sql) => sql`
            SELECT id FROM projects
             WHERE tenant_id = ${session.tid} AND id = ${parsed.data.projectId}
             LIMIT 1
          `);
          if (proj.length === 0) return jsonError(404, "project_not_found");

          const job = await enqueue({
            tenantId: session.tid,
            projectId: parsed.data.projectId,
            kind: parsed.data.kind as JobKind,
            payload: parsed.data.payload,
          });
          return jsonOk({ job });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("jobs_enqueue_failed", err);
          return jsonError(500, "enqueue_failed");
        }
      },
    },
  },
});
