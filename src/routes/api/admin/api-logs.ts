/**
 * Owner-only viewer for hn_api_logs.
 * GET /api/admin/api-logs?limit=200&status=4xx
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireOwner } from "@/lib/auth/owner.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/admin/api-logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireOwner(request);
          const url = new URL(request.url);
          const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200), 1), 1000);
          const filter = url.searchParams.get("status"); // "errors" → status >= 400
          const endpointLike = url.searchParams.get("endpoint");

          let q = supabaseAdmin
            .from("hn_api_logs")
            .select("id, created_at, endpoint, method, status, workspace_id, api_key_id, origin, ip, duration_ms, error")
            .order("created_at", { ascending: false })
            .limit(limit);

          if (filter === "errors") q = q.gte("status", 400);
          if (endpointLike) q = q.ilike("endpoint", `%${endpointLike}%`);

          const { data, error } = await q;
          if (error) return jsonError(500, "logs_read_failed");
          return jsonOk({ logs: data ?? [] });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("api_logs_failed", err);
          return jsonError(500, "logs_read_failed");
        }
      },
    },
  },
});
