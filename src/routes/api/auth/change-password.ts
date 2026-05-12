import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
import { hashPassword, verifyPassword } from "@/lib/auth/password.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";

const Schema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(256),
});

export const Route = createFileRoute("/api/auth/change-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let session;
        try {
          session = await requireSession(request);
        } catch (e) {
          if (e instanceof AuthError) return jsonError(e.status, e.code);
          throw e;
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError(400, "invalid_json");
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return jsonError(400, "invalid_input");
        const { currentPassword, newPassword } = parsed.data;
        if (currentPassword === newPassword) {
          return jsonError(400, "same_password");
        }

        const sql = getSql();
        try {
          const rows = (await sql`
            SELECT password_hash FROM users WHERE id = ${session.sub} LIMIT 1
          `) as Array<{ password_hash: string }>;
          if (rows.length === 0) return jsonError(401, "unauthenticated");

          const ok = await verifyPassword(currentPassword, rows[0].password_hash);
          if (!ok) return jsonError(401, "invalid_credentials");

          const newHash = await hashPassword(newPassword);
          await sql`
            UPDATE users SET password_hash = ${newHash} WHERE id = ${session.sub}
          `;
          return jsonOk({ changed: true });
        } catch (err) {
          console.error("change_password_failed", err);
          return jsonError(500, "change_password_failed");
        }
      },
    },
  },
});
