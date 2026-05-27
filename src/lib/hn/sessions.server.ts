/**
 * HN Sessions — opaque bearer tokens stored as sha256(hex) in Neon.
 * Replaces Supabase Auth sessions for site-facing APIs.
 *
 * Token format (returned to the client ONCE on issue):
 *   hns_<prefix8>.<rand40>
 *
 * The DB stores only token_hash + token_prefix.
 */
import { randomBytes, createHash } from "node:crypto";
import { withBypass, withTenant } from "@/lib/db/tenant.server";

const TTL_DAYS = 30;

export type IssueOpts = {
  tenantId: string;
  userId: string;
  sourceApp?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  ttlSeconds?: number;
};

export type HnSession = {
  id: string;
  tenant_id: string;
  user_id: string;
  token_prefix: string;
  source_app: string | null;
  expires_at: string;
  revoked_at: string | null;
  last_active_at: string;
  created_at: string;
};

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function newToken(): { token: string; prefix: string; hash: string } {
  const prefix = randomBytes(4).toString("hex"); // 8 chars
  const rand = randomBytes(20).toString("hex");  // 40 chars
  const token = `hns_${prefix}.${rand}`;
  return { token, prefix, hash: hashToken(token) };
}

/**
 * Issue a new bearer token. Returns the RAW token — show it once.
 */
export async function issueSession(opts: IssueOpts): Promise<{ token: string; session: HnSession }> {
  const { token, prefix, hash } = newToken();
  const ttlSec = opts.ttlSeconds ?? TTL_DAYS * 24 * 60 * 60;

  const rows = await withTenant<HnSession>(opts.tenantId, (sql) => sql`
    INSERT INTO hn_sessions (
      tenant_id, user_id, token_hash, token_prefix,
      user_agent, ip_address, source_app, expires_at
    ) VALUES (
      ${opts.tenantId}, ${opts.userId}, ${hash}, ${prefix},
      ${opts.userAgent ?? null}, ${opts.ipAddress ?? null}, ${opts.sourceApp ?? null},
      now() + (${ttlSec}::text || ' seconds')::interval
    )
    RETURNING id, tenant_id, user_id, token_prefix, source_app,
              expires_at, revoked_at, last_active_at, created_at
  `);

  return { token, session: rows[0]! };
}

/**
 * Resolve a bearer token (raw) → session + user context, or null.
 * Uses bypass because we don't know the tenant yet at the time of resolution.
 */
export async function resolveSession(rawToken: string): Promise<
  | (HnSession & { user_email: string; user_role: string })
  | null
> {
  if (!rawToken || !rawToken.startsWith("hns_")) return null;
  const hash = hashToken(rawToken);

  const rows = await withBypass<
    HnSession & { user_email: string; user_role: string }
  >((sql) => sql`
    SELECT s.id, s.tenant_id, s.user_id, s.token_prefix, s.source_app,
           s.expires_at, s.revoked_at, s.last_active_at, s.created_at,
           u.email AS user_email, u.role AS user_role
    FROM hn_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hash}
      AND s.revoked_at IS NULL
      AND s.expires_at > now()
    LIMIT 1
  `);

  const s = rows[0];
  if (!s) return null;

  // Touch last_active_at (best effort, fire-and-forget pattern)
  await withBypass((sql) => sql`
    UPDATE hn_sessions SET last_active_at = now() WHERE id = ${s.id}
  `).catch(() => {});

  return s;
}

export async function revokeSession(tenantId: string, sessionId: string): Promise<void> {
  await withTenant(tenantId, (sql) => sql`
    UPDATE hn_sessions SET revoked_at = now()
    WHERE id = ${sessionId} AND tenant_id = ${tenantId}
  `);
}

export async function revokeAllForUser(tenantId: string, userId: string): Promise<number> {
  const rows = await withTenant<{ id: string }>(tenantId, (sql) => sql`
    UPDATE hn_sessions SET revoked_at = now()
    WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND revoked_at IS NULL
    RETURNING id
  `);
  return rows.length;
}
