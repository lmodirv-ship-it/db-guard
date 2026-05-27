import { createFileRoute } from "@tanstack/react-router";
import { systemHealth } from "@/lib/hn/monitoring.server";

export const Route = createFileRoute("/api/hn/runtime/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await systemHealth();
          return Response.json({ ok: true, ...data });
        } catch (e) {
          return Response.json({ ok: false, error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
