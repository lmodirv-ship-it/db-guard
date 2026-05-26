/**
 * /api/team
 *  GET  — list members + pending invites
 *  POST — invite { email, role }
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { requireOwner } from "@/lib/auth/owner.server";
import { getTenantPlan } from "@/lib/platform/plan-limits.server";
import { audit } from "@/lib/audit/log.server";

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  role: z.enum(["owner", "admin", "editor", "viewer", "member"]).default("member"),
});

export const Route = createFileRoute("/api/team/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const s = await requireSession(request);
          const members = await withTenant<{
            id: string; email: string; name: string | null; role: string; created_at: string;
          }>(s.tid, (sql) => sql`
            SELECT id, email, name, role, created_at
            FROM users WHERE tenant_id = ${s.tid} ORDER BY created_at ASC
          `);
          const invites = await withTenant<{
            id: string; email: string; role: string; accepted_at: string | null; created_at: string;
          }>(s.tid, (sql) => sql`
            SELECT id, email, role, accepted_at, created_at
            FROM team_invites WHERE tenant_id = ${s.tid} AND accepted_at IS NULL
            ORDER BY created_at DESC
          `);
          return jsonOk({ members, invites });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "list_failed");
        }
      },
      POST: async ({ request }) => {
        try {
          const s = await requireOwner(request);
          const body = await request.json().catch(() => null);
          const parsed = InviteSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");

          const plan = await getTenantPlan(s.tid);
          const c = await withTenant<{ c: number }>(s.tid, (sql) => sql`
            SELECT (SELECT count(*)::int FROM users WHERE tenant_id = ${s.tid}) +
                   (SELECT count(*)::int FROM team_invites WHERE tenant_id = ${s.tid} AND accepted_at IS NULL) AS c
          `);
          if ((c[0]?.c ?? 0) >= plan.max_team) {
            return jsonError(402, "plan_limit_team", { limit: plan.max_team });
          }

          const r = await withTenant<{ id: string; token: string }>(s.tid, (sql) => sql`
            INSERT INTO team_invites (tenant_id, email, role, invited_by)
            VALUES (${s.tid}, ${parsed.data.email}, ${parsed.data.role}, ${s.sub})
            RETURNING id, token
          `);
          await audit({ action: "team.invite", tenantId: s.tid, actorUserId: s.sub, target: r[0].id, meta: { email: parsed.data.email, role: parsed.data.role }, request });
          return jsonOk({ invite: r[0] });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("team_invite_failed", err);
          return jsonError(500, "invite_failed");
        }
      },
    },
  },
});
