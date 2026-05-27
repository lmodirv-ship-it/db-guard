/**
 * HN owner auth middleware for TanStack server functions.
 * Reads the hn_session cookie (set by /api/auth/login) and verifies the
 * user has role='owner' in the Neon `users` table.
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db/client.server";
import { getSessionFromRequest } from "./session.server";

export const requireHnOwner = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request) throw new Error("Unauthorized: no request");

    const session = await getSessionFromRequest(request);
    if (!session) throw new Error("Unauthorized: no session");

    const sql = getSql();
    const rows = (await sql`
      SELECT role FROM users WHERE id = ${session.sub} LIMIT 1
    `) as Array<{ role: string }>;
    if (rows.length === 0) throw new Error("Unauthorized: user not found");
    if (rows[0].role !== "owner") throw new Error("Forbidden: not an owner");

    return next({
      context: {
        userId: session.sub,
        tenantId: session.tid,
        email: session.email,
      },
    });
  },
);
