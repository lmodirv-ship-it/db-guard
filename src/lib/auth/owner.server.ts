/**
 * Owner-role guard. Verifies the session belongs to a user with role='owner'
 * by reading the users table (single round-trip).
 */
import { getSql } from "@/lib/db/client.server";
import { requireSession, AuthError } from "./session.server";

export async function requireOwner(request: Request) {
  const session = await requireSession(request);
  const sql = getSql();
  const rows = (await sql`
    SELECT role FROM users WHERE id = ${session.sub} LIMIT 1
  `) as Array<{ role: string }>;
  if (rows.length === 0) throw new AuthError(401, "unauthenticated");
  if (rows[0].role !== "owner") throw new AuthError(403, "forbidden");
  return session;
}
