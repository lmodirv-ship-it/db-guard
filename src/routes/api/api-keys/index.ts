/**
 * /api/api-keys
 *  GET  — list (without secrets)
 *  POST — create { name, scopes? } returns plaintext key ONCE
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { withTenant } from "@/lib/db/tenant.server";
import { requireSession, jsonError, jsonOk, AuthError } from "@/lib/auth/session.server";
import { generateApiKey, hashApiKey, keyPrefix } from "@/lib/platform/api-keys.server";
import { getTenantPlan } from "@/lib/platform/plan-limits.server";
import { audit } from "@/lib/audit/log.server";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.enum(["read", "write", "admin"])).optional(),
});

export const Route = createFileRoute("/api/api-keys/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const s = await requireSession(request);
          const rows = await withTenant<{
            id: string; name: string; key_prefix: string; scopes: string[];
            last_used_at: string | null; revoked_at: string | null; created_at: string;
          }>(s.tid, (sql) => sql`
            SELECT id, name, key_prefix, scopes, last_used_at, revoked_at, created_at
            FROM api_keys WHERE tenant_id = ${s.tid} ORDER BY created_at DESC
          `);
          return jsonOk({ keys: rows });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          return jsonError(500, "list_failed");
        }
      },
      POST: async ({ request }) => {
        try {
          const s = await requireSession(request);
          const body = await request.json().catch(() => null);
          const parsed = CreateSchema.safeParse(body);
          if (!parsed.success) return jsonError(400, "invalid_input");

          const plan = await getTenantPlan(s.tid);
          const c = await withTenant<{ c: number }>(s.tid, (sql) => sql`
            SELECT count(*)::int AS c FROM api_keys WHERE tenant_id = ${s.tid} AND revoked_at IS NULL
          `);
          if ((c[0]?.c ?? 0) >= plan.max_api_keys) {
            return jsonError(402, "plan_limit_api_keys", { limit: plan.max_api_keys });
          }

          const fullKey = generateApiKey();
          const hash = await hashApiKey(fullKey);
          const prefix = keyPrefix(fullKey);
          const scopes = parsed.data.scopes ?? ["read", "write"];
          const inserted = await withTenant<{ id: string }>(s.tid, (sql) => sql`
            INSERT INTO api_keys (tenant_id, created_by, name, key_prefix, key_hash, scopes)
            VALUES (${s.tid}, ${s.sub}, ${parsed.data.name}, ${prefix}, ${hash}, ${scopes})
            RETURNING id
          `);
          await audit({ action: "api_key.create", tenantId: s.tid, actorUserId: s.sub, target: inserted[0].id, meta: { name: parsed.data.name }, request });
          return jsonOk({ id: inserted[0].id, key: fullKey, prefix, name: parsed.data.name });
        } catch (err) {
          if (err instanceof AuthError) return jsonError(err.status, err.code);
          console.error("api_key_create_failed", err);
          return jsonError(500, "create_failed");
        }
      },
    },
  },
});
