import { createFileRoute } from "@tanstack/react-router";
import { getSql, pingDb } from "@/lib/db/client.server";
import { requireOwner } from "@/lib/auth/owner.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { audit } from "@/lib/audit/log.server";

export const Route = createFileRoute("/api/admin/db-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireOwner(request);
          const ping = await pingDb();
          const sql = getSql();
          let migrations: Array<{ name: string; applied_at: string }> = [];
          let counts = { tenants: 0, users: 0, projects: 0, jobs: 0, records: 0 };
          try {
            migrations = (await sql`
              SELECT name, applied_at FROM schema_migrations
              ORDER BY applied_at DESC LIMIT 20
            `) as typeof migrations;
          } catch {
            // migrations table may not exist yet
          }
          try {
            const rows = (await sql`
              SELECT
                (SELECT COUNT(*)::int FROM tenants)  AS tenants,
                (SELECT COUNT(*)::int FROM users)    AS users,
                (SELECT COUNT(*)::int FROM projects) AS projects,
                (SELECT COUNT(*)::int FROM jobs)     AS jobs,
                (SELECT COUNT(*)::int FROM records)  AS records
            `) as Array<typeof counts>;
            counts = rows[0] ?? counts;
          } catch {
            // tables missing — schema not initialised
          }
          await audit({
            action: "db.status_checked",
            actorUserId: session.sub,
            tenantId: session.tid,
            meta: { ok: ping.ok, latencyMs: ping.latencyMs },
            request,
          });
          return jsonOk({ ping, migrations, counts });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("db_status_failed", err);
          return jsonError(500, "db_status_failed");
        }
      },
    },
  },
});
