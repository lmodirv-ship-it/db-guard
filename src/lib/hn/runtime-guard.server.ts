/**
 * Shared auth guard for /api/hn/runtime/* endpoints.
 *
 * Accepts EITHER:
 *   - An owner session cookie (logged-in owner in the dashboard), OR
 *   - A pre-shared secret in the `x-runtime-secret` header that matches
 *     the `RUNTIME_SECRET` environment variable (for cron / external schedulers).
 *
 * Returns null on success, or a Response (401/403) to short-circuit the handler.
 */
import { requireOwner } from "@/lib/auth/owner.server";
import { AuthError } from "@/lib/auth/session.server";

export async function guardRuntime(request: Request): Promise<Response | null> {
  // 1) Pre-shared secret (constant-time-ish compare via length + char xor)
  const provided = request.headers.get("x-runtime-secret");
  const expected = process.env.RUNTIME_SECRET;
  if (provided && expected && safeEqual(provided, expected)) {
    return null;
  }

  // 2) Owner cookie session
  try {
    await requireOwner(request);
    return null;
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(
        JSON.stringify({ ok: false, error: err.code }),
        { status: err.status, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ ok: false, error: "unauthenticated" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
