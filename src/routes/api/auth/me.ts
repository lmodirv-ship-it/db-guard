import { createFileRoute } from "@tanstack/react-router";
import { getSessionFromRequest, jsonError, jsonOk } from "@/lib/auth/session.server";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return jsonError(401, "unauthenticated");
        return jsonOk({
          user: {
            id: session.sub,
            email: session.email,
            tenantId: session.tid,
          },
        });
      },
    },
  },
});
