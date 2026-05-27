/**
 * Ensure the current owner has a corresponding hn_users row + at least one
 * hn_workspaces row in Supabase. Idempotent — safe to call on every owner
 * server function. Never throws "no_workspace"; auto-creates instead.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EnsuredOwnerWorkspace = {
  hnUserId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  created: boolean;
};

function randomCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `HN${n}`;
}

export async function ensureOwnerWorkspaceSupabase(opts: {
  email: string;
  fullName?: string;
}): Promise<EnsuredOwnerWorkspace> {
  const email = opts.email.trim().toLowerCase();
  const fullName = (opts.fullName ?? email.split("@")[0]).trim() || "Owner";

  // 1) Find or create the hn_users shadow row for this owner.
  let hnUserId: string;
  {
    const { data: existing } = await supabaseAdmin
      .from("hn_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      hnUserId = existing.id;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("hn_users")
        .insert({
          email,
          full_name: fullName,
          hn_user_code: randomCode(),
          password_hash: "OWNER_NO_PASSWORD",
          registration_source: "owner-bootstrap",
          plan: "owner",
          status: "active",
        })
        .select("id")
        .single();
      if (error || !created) {
        // Race: another request just inserted — re-read.
        const { data: again } = await supabaseAdmin
          .from("hn_users")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (!again) throw new Error(`hn_user_create_failed: ${error?.message ?? "unknown"}`);
        hnUserId = again.id;
      } else {
        hnUserId = created.id;
      }
    }
  }

  // 2) Find or create the default workspace for this hn_user.
  {
    const { data: existing } = await supabaseAdmin
      .from("hn_workspaces")
      .select("id, name, slug")
      .eq("hn_user_id", hnUserId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        hnUserId,
        workspaceId: existing.id,
        workspaceName: existing.name,
        workspaceSlug: existing.slug,
        created: false,
      };
    }

    const slug = `owner-${hnUserId.slice(0, 8)}`;
    const { data: created, error } = await supabaseAdmin
      .from("hn_workspaces")
      .insert({
        hn_user_id: hnUserId,
        name: "Owner Master Workspace",
        slug,
        status: "active",
      })
      .select("id, name, slug")
      .single();
    if (error || !created) {
      throw new Error(`workspace_create_failed: ${error?.message ?? "unknown"}`);
    }
    return {
      hnUserId,
      workspaceId: created.id,
      workspaceName: created.name,
      workspaceSlug: created.slug,
      created: true,
    };
  }
}
