import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";

function genKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "hn_live_";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const NameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9 ._-]+$/, "Invalid characters"),
});

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("api_keys")
      .select("id,name,key_prefix,scopes,status,revoked_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { keys: data ?? [] };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => NameSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = genKey();
    const key_hash = await sha256(key);
    const key_prefix = key.slice(0, 12);

    const { data: row, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: userId,
        name: data.name,
        key_prefix,
        key_hash,
        scopes: ["read", "write", "admin"],
        status: "active",
      })
      .select("id,name,key_prefix,scopes,status,revoked_at,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { key, row };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("api_keys")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
