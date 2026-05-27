/**
 * HN Access — single request guard for server functions / server routes.
 *
 * Usage in a server route:
 *   const ctx = await requireHnAccess(request, "db.read");
 *   // ctx.userId, ctx.tenantId, ctx.session
 *
 * Token sources (in order):
 *   1. Authorization: Bearer hns_...
 *   2. X-HN-Token: hns_...
 *   3. Cookie hn_token=hns_...
 */
import { resolveSession } from "./sessions.server";
import { assertPermission, type PermissionCode } from "./permissions.server";

export class HnAccessError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

function readToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const xhn = request.headers.get("x-hn-token");
  if (xhn) return xhn.trim();

  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)hn_token=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);

  return null;
}

export type HnAccessContext = {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  sessionId: string;
  sourceApp: string | null;
};

export async function requireHnAccess(
  request: Request,
  permission?: PermissionCode,
): Promise<HnAccessContext> {
  const raw = readToken(request);
  if (!raw) throw new HnAccessError(401, "missing_token");

  const session = await resolveSession(raw);
  if (!session) throw new HnAccessError(401, "invalid_or_expired_token");

  if (permission) {
    try {
      await assertPermission(session.user_id, session.tenant_id, permission);
    } catch {
      throw new HnAccessError(403, `permission_denied:${permission}`);
    }
  }

  return {
    userId: session.user_id,
    tenantId: session.tenant_id,
    email: session.user_email,
    role: session.user_role,
    sessionId: session.id,
    sourceApp: session.source_app,
  };
}

export function hnAccessErrorResponse(err: unknown): Response {
  if (err instanceof HnAccessError) {
    return new Response(
      JSON.stringify({ ok: false, error: err.code }),
      { status: err.status, headers: { "Content-Type": "application/json" } },
    );
  }
  return new Response(
    JSON.stringify({ ok: false, error: "internal_error" }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}
