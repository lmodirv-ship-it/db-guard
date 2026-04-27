import { createFileRoute } from "@tanstack/react-router";
import { buildClearSessionCookie } from "@/lib/auth/cookies.server";
import { jsonOk } from "@/lib/auth/session.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        return jsonOk(
          { loggedOut: true },
          { headers: { "Set-Cookie": buildClearSessionCookie() } },
        );
      },
    },
  },
});
