/**
 * HN Connect — resolve a site by its public slug and validate the calling
 * Origin against the site's allowed_origins list. No API key is required
 * from the browser; secrets stay server-side.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type VerifiedSite = {
  site_id: string;
  workspace_id: string;
  hn_user_id: string;
  site_host: string;
  slug: string;
  data_enabled: boolean;
  storage_enabled: boolean;
  auth_enabled: boolean;
  sso_app_key: string | null;
  allowed_origins: string[];
};

function normalizeOrigin(o: string | null | undefined): string | null {
  if (!o) return null;
  try {
    const u = new URL(o);
    return `${u.protocol}//${u.host}`.toLowerCase();
  } catch {
    return null;
  }
}

export function originAllowed(origin: string | null, allowed: string[], siteHost: string): boolean {
  const norm = normalizeOrigin(origin);
  // Allow same-origin / server-to-server (no Origin header)
  if (!norm) return true;
  const list = new Set<string>();
  for (const a of allowed || []) {
    const n = normalizeOrigin(a);
    if (n) list.add(n);
  }
  // Always include the site's own host
  if (siteHost) {
    list.add(`https://${siteHost.toLowerCase()}`);
    list.add(`http://${siteHost.toLowerCase()}`);
  }
  // Allow localhost for dev
  if (norm.startsWith("http://localhost") || norm.startsWith("http://127.0.0.1")) return true;
  return list.has(norm);
}

export async function verifySiteSlug(
  slug: string | null | undefined,
  origin: string | null,
): Promise<{ site: VerifiedSite | null; reason?: string }> {
  if (!slug || typeof slug !== "string") return { site: null, reason: "missing_site" };
  const s = slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,60}$/.test(s)) return { site: null, reason: "invalid_site" };

  const { data, error } = await supabaseAdmin
    .from("hn_sites")
    .select(
      "id, workspace_id, site_host, slug, data_enabled, storage_enabled, auth_enabled, sso_app_key, allowed_origins, status",
    )
    .eq("slug", s)
    .maybeSingle();

  if (error || !data) return { site: null, reason: "site_not_found" };
  if (data.status !== "active") return { site: null, reason: "site_inactive" };

  if (!originAllowed(origin, data.allowed_origins ?? [], data.site_host)) {
    return { site: null, reason: "origin_not_allowed" };
  }

  // Resolve workspace owner
  const { data: ws } = await supabaseAdmin
    .from("hn_workspaces")
    .select("hn_user_id")
    .eq("id", data.workspace_id)
    .maybeSingle();
  if (!ws) return { site: null, reason: "workspace_not_found" };

  return {
    site: {
      site_id: data.id,
      workspace_id: data.workspace_id,
      hn_user_id: ws.hn_user_id,
      site_host: data.site_host,
      slug: data.slug,
      data_enabled: !!data.data_enabled,
      storage_enabled: !!data.storage_enabled,
      auth_enabled: !!data.auth_enabled,
      sso_app_key: data.sso_app_key,
      allowed_origins: data.allowed_origins ?? [],
    },
  };
}
