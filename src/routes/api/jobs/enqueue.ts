import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { withTenant } from "@/lib/db/tenant.server";
import { enqueueJob, type JobKind } from "@/lib/jobs/queue.server";

const Schema = z.object({
  projectId: z.string().regex(/^[0-9a-f-]{36}$/i),
  kind: z.enum(["verify", "analyze", "generate_schema", "full_pipeline"]),
});

export const Route = createFileRoute("/api/jobs/enqueue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");

          // Tenant-isolated existence check
          const rows = await withTenant<{ id: string }>(session.tid, (sql) => sql`
            SELECT id FROM projects
            WHERE tenant_id = ${session.tid} AND id = ${parsed.data.projectId} LIMIT 1
          `);
          if (!rows[0]) return jsonError(404, "not_found");

          const r = await enqueueJob({
            tenantId: session.tid,
            projectId: parsed.data.projectId,
            kind: parsed.data.kind as JobKind,
          });
          return jsonOk({ jobId: r.id, queued: r.queued });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("enqueue_failed", err);
          return jsonError(500, "enqueue_failed");
        }
      },
    },
  },
});
