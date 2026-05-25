import { createFileRoute } from "@tanstack/react-router";
import { requireOwner } from "@/lib/auth/owner.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/admin/id-users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireOwner(request);
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "internal");
        }
        const { data, error } = await supabaseAdmin
          .from("id_users")
          .select("id, login_id, full_name, email, phone, status, created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) return jsonError(500, "internal");
        return jsonOk({ users: data ?? [] });
      },
    },
  },
});
