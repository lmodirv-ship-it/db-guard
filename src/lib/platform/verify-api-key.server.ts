/**
 * Validate an `X-HN-Api-Key` header against the `hn_api_keys` table.
 * Returns the owning workspace_id + hn_user_id on success.
 *
 * Server-only — uses supabaseAdmin to bypass RLS.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashApiKey } from "./api-keys.server";

export type VerifiedKey = {
  workspace_id: string;
  hn_user_id: string;
  key_id: string;
};

export async function verifyApiKey(rawKey: string | null | undefined): Promise<VerifiedKey | null> {
  if (!rawKey || typeof rawKey !== "string") return null;
  const key = rawKey.trim();
  if (!key.startsWith("dbg_") || key.length < 16 || key.length > 80) return null;

  const hash = await hashApiKey(key);
  const { data, error } = await supabaseAdmin
    .from("hn_api_keys")
    .select("id, workspace_id, hn_user_id, revoked_at")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;

  // fire-and-forget last_used_at update
  void supabaseAdmin
    .from("hn_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    workspace_id: data.workspace_id,
    hn_user_id: data.hn_user_id,
    key_id: data.id,
  };
}
