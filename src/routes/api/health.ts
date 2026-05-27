import { createFileRoute } from "@tanstack/react-router";
import { checkEnv } from "@/lib/env.server";
import { pingDb } from "@/lib/db/client.server";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const ts = new Date().toISOString();
        const env = checkEnv();
        if (!env.ok) {
          // Log details server-side only; do not leak env-var names to clients.
          console.error("health: env_missing", { missing: env.missing, invalid: env.invalid });
          return new Response(
            JSON.stringify({ ok: false, status: "env_missing", ts }),
            { status: 503, headers: JSON_HEADERS },
          );
        }

        const db = await pingDb();
        if (!db.ok) {
          console.error("health: db_unreachable", { error: db.error, latencyMs: db.latencyMs });
          return new Response(
            JSON.stringify({ ok: false, status: "db_unreachable", ts }),
            { status: 503, headers: JSON_HEADERS },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            status: "healthy",
            db: { latencyMs: db.latencyMs },
            ts: new Date().toISOString(),
          }),
          { status: 200, headers: JSON_HEADERS },
        );
      },
    },
  },
});
