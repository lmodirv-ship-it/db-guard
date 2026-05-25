import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSessionFromRequest, jsonError, jsonOk } from "@/lib/auth/session.server";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return jsonError(401, "session_expired");

        // Try to enrich with hn_users data (HN ID, full name).
        const { data, error } = await supabaseAdmin
          .from("hn_users")
          .select("id, email, full_name, hn_user_code, status")
          .eq("id", session.sub)
          .maybeSingle();

        if (error) console.error("[me] db_error", error);

        if (!data) {
          // Token is valid (signed by us) but the user no longer exists.
          return jsonOk({
            user: {
              id: session.sub,
              email: session.email,
              tenantId: session.tid,
              full_name: null,
              hn_user_code: null,
            },
          });
        }

        return jsonOk({
          user: {
            id: data.id,
            email: data.email,
            full_name: data.full_name,
            hn_user_code: data.hn_user_code,
            tenantId: session.tid,
          },
        });
      },
    },
  },
});
