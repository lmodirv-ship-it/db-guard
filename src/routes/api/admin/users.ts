import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db/client.server";
import { hashPassword } from "@/lib/auth/password.server";
import { requireOwner } from "@/lib/auth/owner.server";
import { jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { audit } from "@/lib/audit/log.server";

const CreateSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(256),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireOwner(request);
          const sql = getSql();
          const rows = (await sql`
            SELECT id, email, name, role, created_at, tenant_id
            FROM users
            WHERE tenant_id = ${session.tid}
            ORDER BY created_at DESC
            LIMIT 200
          `) as Array<Record<string, unknown>>;
          return jsonOk({ users: rows });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("users_list_failed", err);
          return jsonError(500, "list_failed");
        }
      },

      POST: async ({ request }) => {
        try {
          const session = await requireOwner(request);
          const body = await request.json().catch(() => null);
          const parsed = CreateSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");
          const { email, password, name, role } = parsed.data;
          const sql = getSql();
          const exists = (await sql`
            SELECT 1 FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
          `) as Array<unknown>;
          if (exists.length > 0) return jsonError(409, "email_exists");
          const hash = await hashPassword(password);
          const rows = (await sql`
            INSERT INTO users (tenant_id, email, password_hash, name, role)
            VALUES (${session.tid}, ${email}, ${hash}, ${name ?? null}, ${role})
            RETURNING id, email, name, role, created_at
          `) as Array<Record<string, unknown>>;
          return jsonOk({ user: rows[0] });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("user_create_failed", err);
          return jsonError(500, "create_failed");
        }
      },
    },
  },
});
