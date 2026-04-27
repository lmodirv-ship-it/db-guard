/**
 * Resolves the authenticated session from the request cookie.
 * Returns null if no/invalid cookie. Throws 401 helper provided.
 */
import { verifySession, type SessionClaims } from "./jwt.server";
import { readSessionCookie } from "./cookies.server";

export async function getSessionFromRequest(
  request: Request,
): Promise<SessionClaims | null> {
  const token = readSessionCookie(request);
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export function jsonError(status: number, code: string, extra?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ ok: false, error: code, ...(extra ?? {}) }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

export function jsonOk(data: Record<string, unknown>, init?: ResponseInit) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200,
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function requireSession(request: Request): Promise<SessionClaims> {
  const s = await getSessionFromRequest(request);
  if (!s) throw new AuthError(401, "unauthenticated");
  return s;
}

export class AuthError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}
