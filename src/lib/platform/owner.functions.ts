/**
 * Owner-only server functions. Returns full API keys (plaintext) for the
 * owner role. Other roles get 403.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertOwner(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (error || !data) throw new Error("forbidden");
}

export const listAllApiKeysForOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);
    const { data, error } = await supabaseAdmin
      .from("hn_api_keys")
      .select("id, label, key_prefix, key_hint, full_key, workspace_id, hn_user_id, created_at, last_used_at, revoked_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("list_failed");
    return { keys: data ?? [] };
  });
