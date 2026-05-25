/**
 * /api/billing/plans — list all plans (public-ish, requires session)
 * /api/billing/usage — current tenant usage
 */
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
import { jsonError, jsonOk, AuthError, requireSession } from "@/lib/auth/session.server";
import { getTenantPlan, getTenantUsage } from "@/lib/platform/plan-limits.server";

export const Route = createFileRoute("/api/billing/plans")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const sql = getSql();
          const plans = await sql`
            SELECT id, name, price_monthly, max_tables, max_records, max_storage_mb,
                   max_api_keys, max_team, has_backups, has_advanced_logs, features, sort_order
            FROM plans ORDER BY sort_order ASC
          `;
          return jsonOk({ plans });
        } catch (err) {
          console.error("plans_list_failed", err);
          return jsonError(500, "list_failed");
        }
      },
    },
  },
});

export const UsageRoute = null;

export async function getUsageEndpoint(request: Request) {
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
}
