/**
 * Unified auth resolver: accepts either
 *   - Authorization: Bearer dbg_xxxx   (API key, hashed lookup in api_keys)
 *   - Session cookie (JWT)             (browser dashboard)
 *
 * Returns the same SessionClaims shape so existing handlers work unchanged.
 */
import type { SessionClaims } from "./jwt.server";
import { getSessionFromRequest, AuthError } from "./session.server";
import { withBypass } from "@/lib/db/tenant.server";
import { hashApiKey } from "@/lib/platform/api-keys.server";

export type AuthContext = SessionClaims & { via: "session" | "api_key"; apiKeyId?: string };

function readBearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

async function resolveApiKey(token: string): Promise<AuthContext | null> {
  if (!token.startsWith("dbg_")) return null;
  const hash = await hashApiKey(token);

  // Bypass RLS for the lookup itself — we need to find the key by hash across
  // tenants. RLS is re-applied for the actual data queries via withTenant().
  const rows = await withBypass<{
    id: string; tenant_id: string; created_by: string | null; revoked_at: string | null;
  }>((sql) => sql`
    SELECT id, tenant_id, created_by, revoked_at
    FROM api_keys WHERE key_hash = ${hash} LIMIT 1
  `);

  const k = rows[0];
  if (!k || k.revoked_at) return null;

  // Fire-and-forget last_used_at update.
  withBypass((sql) => sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${k.id}`).catch(
    (e) => console.error("api_key_last_used_update_failed", e),
  );

  return {
    sub: k.created_by ?? k.id,
    tid: k.tenant_id,
    email: `api-key:${k.id}`,
    via: "api_key",
    apiKeyId: k.id,
  };
}

/**
 * Resolves the request to an auth context. Returns null when neither method
 * yields a valid principal.
 */
export async function getAuth(request: Request): Promise<AuthContext | null> {
  const bearer = readBearer(request);
  if (bearer) {
    const k = await resolveApiKey(bearer);
    if (k) return k;
    // Bearer present but invalid → reject (don't fall back to cookie).
    throw new AuthError(401, "invalid_api_key");
  }
  const s = await getSessionFromRequest(request);
  if (!s) return null;
  return { ...s, via: "session" };
}

/**
 * Throws AuthError(401) if neither a valid bearer key nor a session cookie
 * is present. Otherwise returns the auth context.
 */
export async function requireAuth(request: Request): Promise<AuthContext> {
  const a = await getAuth(request);
  if (!a) throw new AuthError(401, "unauthenticated");
  return a;
}
