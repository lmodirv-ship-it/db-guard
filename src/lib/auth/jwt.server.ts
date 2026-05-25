/**
 * JWT signing/verification via `jose` (HS256).
 * Token claims: sub (userId), tid (tenantId), email, iat, exp.
 */
import { SignJWT, jwtVerify } from "jose";

const ISSUER = "smart-generator";
const AUDIENCE = "smart-generator-app";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionClaims = {
  sub: string; // user id
  tid: string; // tenant id
  email: string;
};

let _key: Uint8Array | null = null;
function getKey(): Uint8Array {
  if (_key) return _key;
  const secret = process.env.HN_JWT_SECRET?.trim();
  if (!secret) throw new Error("env_misconfigured: missing=HN_JWT_SECRET");
  if (secret.length < 32) throw new Error("env_misconfigured: invalid=HN_JWT_SECRET");
  _key = new TextEncoder().encode(secret);
  return _key;
}

export async function signSession(
  claims: SessionClaims,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .setSubject(claims.sub)
    .sign(getKey());
}

export async function verifySession(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, getKey(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (
    typeof payload.sub !== "string" ||
    typeof payload.tid !== "string" ||
    typeof payload.email !== "string"
  ) {
    throw new Error("invalid_claims");
  }
  return { sub: payload.sub, tid: payload.tid, email: payload.email };
}

export const SESSION_COOKIE = "hn_session";
export const SESSION_TTL_SECONDS = DEFAULT_TTL_SECONDS;
