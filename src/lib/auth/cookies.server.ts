/**
 * Cookie helpers. We avoid the `@tanstack/react-start/server` cookie utils
 * for portability — server routes get the raw Request and return Response.
 */
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./jwt.server";

export function buildSessionCookie(token: string): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  return parts.join("; ");
}

export function buildClearSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Max-Age=0",
  ].join("; ");
}

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const items = header.split(";");
  for (const item of items) {
    const [k, ...rest] = item.trim().split("=");
    if (k === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}
