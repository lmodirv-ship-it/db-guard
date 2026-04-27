import { createFileRoute } from "@tanstack/react-router";
// Triggers TS module augmentation that adds the `server` property to route options.
import type {} from "@tanstack/start-client-core";
import { checkEnv } from "@/lib/env.server";
import { pingDb } from "@/lib/db/client.server";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const env = checkEnv();
        if (!env.ok) {
          return new Response(
            JSON.stringify({
              ok: false,
              status: "env_missing",
              missing: env.missing,
              invalid: env.invalid,
              ts: new Date().toISOString(),
            }),
            { status: 503, headers: JSON_HEADERS },
          );
        }

        const db = await pingDb();
        if (!db.ok) {
          return new Response(
            JSON.stringify({
              ok: false,
              status: "db_unreachable",
              error: db.error,
              latencyMs: db.latencyMs,
              ts: new Date().toISOString(),
            }),
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
