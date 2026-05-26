import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Imports the real list of public tables from the connected database.
 * Requires a valid API key belonging to the signed-in user.
 */
export const importPublicTables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        apiKeyPrefix: z.string().min(4).max(20).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify the user has at least one active API key (optionally matching the prefix).
    let q = supabase
      .from("api_keys")
      .select("id,key_prefix,status")
      .eq("user_id", userId)
      .eq("status", "active");
    if (data.apiKeyPrefix) q = q.eq("key_prefix", data.apiKeyPrefix);
    const { data: keys, error: kErr } = await q.limit(1);
    if (kErr) throw new Error(kErr.message);
    if (!keys || keys.length === 0) {
      throw new Error("No active API key. Generate one first.");
    }

    // Real query against information_schema via SECURITY DEFINER function.
    const { data: rows, error } = await supabaseAdmin.rpc("list_public_tables");
    if (error) throw new Error(error.message);

    return {
      tables: (rows ?? []) as Array<{ table_name: string; row_count: number }>,
      importedAt: new Date().toISOString(),
    };
  });
