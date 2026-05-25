/**
 * HN Database Engine client (Workers-compatible, stateless).
 * Singleton per worker isolate.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { requireEnv } from "../env.server";

let _sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const env = requireEnv();
  _sql = neon(env.HN_DB_URL);
  return _sql;
}

/**
 * Lightweight DB ping — used by /api/health.
 */
export async function pingDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const sql = getSql();
    const rows = (await sql`SELECT 1 AS ok`) as Array<{ ok: number }>;
    if (!rows?.[0] || rows[0].ok !== 1) {
      return { ok: false, latencyMs: Date.now() - start, error: "unexpected_response" };
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
