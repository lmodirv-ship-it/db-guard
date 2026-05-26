/**
 * /api/billing/usage — current plan + usage counters
 */
import { createFileRoute } from "@tanstack/react-router";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { requireAuth as requireSession } from "@/lib/auth/api-auth.server";
import { getTenantPlan, getTenantUsage } from "@/lib/platform/plan-limits.server";

export const Route = createFileRoute("/api/billing/usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const s = await requireSession(request);
          const [plan, usage] = await Promise.all([
            getTenantPlan(s.tid),
            getTenantUsage(s.tid),
          ]);
          return jsonOk({ plan, usage });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "usage_failed");
        }
      },
    },
  },
});
