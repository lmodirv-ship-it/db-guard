/**
 * HN Event Bus — append-only events table. Other services tail it.
 */
import { withBypass } from "@/lib/db/tenant.server";

export type EventSeverity = "info" | "warn" | "error";

export type EmitOpts = {
  type: string;
  tenantId?: string | null;
  siteId?: string | null;
  severity?: EventSeverity;
  source?: string;
  actor?: string;
  payload?: Record<string, unknown>;
};

export async function emit(opts: EmitOpts): Promise<void> {
  try {
    await withBypass((sql) => sql`
      INSERT INTO hn_events (tenant_id, site_id, type, severity, source, actor, payload)
      VALUES (
        ${opts.tenantId ?? null},
        ${opts.siteId ?? null},
        ${opts.type},
        ${opts.severity ?? "info"},
        ${opts.source ?? "system"},
        ${opts.actor ?? null},
        ${JSON.stringify(opts.payload ?? {})}::jsonb
      )
    `);
  } catch (e) {
    console.error("[hn-events] emit failed", opts.type, e);
  }
}

export type EventRow = {
  id: string;
  tenant_id: string | null;
  site_id: string | null;
  type: string;
  severity: EventSeverity;
  source: string | null;
  actor: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export async function tail(limit = 100, filters: { type?: string; siteId?: string; severity?: EventSeverity } = {}): Promise<EventRow[]> {
  const lim = Math.min(Math.max(limit, 1), 500);
  return withBypass<EventRow>((sql) => sql`
    SELECT id, tenant_id, site_id, type, severity, source, actor, payload, created_at
    FROM hn_events
    WHERE (${filters.type ?? null}::text IS NULL OR type = ${filters.type ?? null})
      AND (${filters.siteId ?? null}::uuid IS NULL OR site_id = ${filters.siteId ?? null}::uuid)
      AND (${filters.severity ?? null}::text IS NULL OR severity = ${filters.severity ?? null})
    ORDER BY created_at DESC
    LIMIT ${lim}
  `);
}
