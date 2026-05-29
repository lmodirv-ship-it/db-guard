import { createFileRoute } from "@tanstack/react-router";
import { systemHealth } from "@/lib/hn/monitoring.server";
import { guardRuntime } from "@/lib/hn/runtime-guard.server";

export const Route = createFileRoute("/api/hn/runtime/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const denied = await guardRuntime(request);
          if (denied) return denied;
          const data = await systemHealth();
          return Response.json({ ok: true, ...data });
        } catch (e) {
          return Response.json({ ok: false, error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
