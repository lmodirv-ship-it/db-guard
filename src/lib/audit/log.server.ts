/**
 * Append-only audit log helper.
 * Failures are swallowed (logged only) — auditing must never break a user action.
 */
import { getSql } from "@/lib/db/client.server";

export type AuditEvent = {
  action: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  tenantId?: string | null;
  target?: string | null;
  meta?: Record<string, unknown>;
  request?: Request;
};

function clientIp(request?: Request): string | null {
  if (!request) return null;
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

export async function audit(event: AuditEvent): Promise<void> {
  try {
    const sql = getSql();
    const ip = clientIp(event.request);
    const ua = event.request?.headers.get("user-agent") ?? null;
    const meta = JSON.stringify(event.meta ?? {});
    await sql`
      INSERT INTO audit_logs
        (tenant_id, actor_user_id, actor_email, action, target, meta, ip, user_agent)
      VALUES
        (${event.tenantId ?? null}, ${event.actorUserId ?? null}, ${event.actorEmail ?? null},
         ${event.action}, ${event.target ?? null}, ${meta}::jsonb,
         ${ip}, ${ua})
    `;
  } catch (err) {
    console.error("audit_log_failed", err);
  }
}
