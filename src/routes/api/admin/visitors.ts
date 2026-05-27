import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
import { requireOwner } from "@/lib/auth/owner.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";

export const Route = createFileRoute("/api/admin/visitors")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireOwner(request);
          const sql = getSql();
          // Ensure the table exists (idempotent — covers fresh DBs before migration runs).
          await sql`
            CREATE TABLE IF NOT EXISTS visitors (
              id            BIGSERIAL PRIMARY KEY,
              user_id       UUID,
              email         TEXT NOT NULL,
              name          TEXT,
              ip_address    TEXT,
              user_agent    TEXT,
              referer       TEXT,
              country       TEXT,
              registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
          `;
          const rows = (await sql`
            SELECT id, user_id, email, name, ip_address, user_agent, referer, country, registered_at
            FROM visitors
            ORDER BY id DESC
            LIMIT 500
          `) as Array<Record<string, unknown>>;
          const totalRows = (await sql`SELECT COUNT(*)::int AS c FROM visitors`) as Array<{ c: number }>;
          return jsonOk({ visitors: rows, total: totalRows[0]?.c ?? 0 });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("visitors_list_failed", err);
          return jsonError(500, "list_failed");
        }
      },
    },
  },
});
