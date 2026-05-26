import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSessionFromRequest } from "@/lib/auth/session.server";

const requireSession = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request) throw new Error("Unauthorized: no request");
  const session = await getSessionFromRequest(request);
  if (!session) throw new Error("Unauthorized: please sign in");
  return next({ context: { userId: session.sub } });
});

/**
 * Imports the real list of public tables from the connected database.
 * Requires a valid API key belonging to the signed-in user.
 */
export const importPublicTables = createServerFn({ method: "POST" })
  .middleware([requireSession])
  .inputValidator((input) =>
    z
      .object({
        apiKeyPrefix: z.string().min(4).max(20).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = supabaseAdmin
      .from("api_keys")
      .select("id,key_prefix,status")
      .eq("user_id", context.userId)
      .eq("status", "active");
    if (data.apiKeyPrefix) q = q.eq("key_prefix", data.apiKeyPrefix);
    const { data: keys, error: kErr } = await q.limit(1);
    if (kErr) throw new Error(kErr.message);
    if (!keys || keys.length === 0) {
      throw new Error("No active API key. Generate one first.");
    }

    const { data: rows, error } = await supabaseAdmin.rpc("list_public_tables");
    if (error) throw new Error(error.message);

    return {
      tables: (rows ?? []) as Array<{ table_name: string; row_count: number }>,
      importedAt: new Date().toISOString(),
    };
  });
