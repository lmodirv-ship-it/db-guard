/**
 * HN Connect — resolve a site by slug and validate Origin.
 * Now backed by Neon (`hn_sites`) — fully independent from Supabase.
 */
import { withBypass } from "@/lib/db/tenant.server";

export type VerifiedSite = {
  site_id: string;
  tenant_id: string;
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
  if (!norm) return true; // server-to-server
  const list = new Set<string>();
  for (const a of allowed || []) {
    const n = normalizeOrigin(a);
    if (n) list.add(n);
  }
  if (siteHost) {
    list.add(`https://${siteHost.toLowerCase()}`);
    list.add(`http://${siteHost.toLowerCase()}`);
  }
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

  type Row = {
    id: string;
    tenant_id: string;
    workspace_id: string;
    site_host: string;
    slug: string;
    db_enabled: boolean;
    storage_enabled: boolean;
    auth_enabled: boolean;
    sso_app_key: string | null;
    allowed_origins: string[];
    status: string;
    owner_user_id: string | null;
  };

  const rows = await withBypass<Row>((sql) => sql`
    SELECT s.id, s.tenant_id, s.workspace_id, s.site_host, s.slug,
           s.db_enabled, s.storage_enabled, s.auth_enabled,
           s.sso_app_key, s.allowed_origins, s.status,
           (SELECT u.id FROM users u WHERE u.tenant_id = s.tenant_id ORDER BY u.created_at ASC LIMIT 1) AS owner_user_id
    FROM hn_sites s
    WHERE LOWER(s.slug) = ${s}
    LIMIT 1
  `);
  const data = rows[0];
  if (!data) return { site: null, reason: "site_not_found" };
  if (data.status !== "active") return { site: null, reason: "site_inactive" };

  if (!originAllowed(origin, data.allowed_origins ?? [], data.site_host)) {
    return { site: null, reason: "origin_not_allowed" };
  }

  return {
    site: {
      site_id: data.id,
      tenant_id: data.tenant_id,
      workspace_id: data.workspace_id,
      hn_user_id: data.owner_user_id ?? "",
      site_host: data.site_host,
      slug: data.slug,
      data_enabled: !!data.db_enabled,
      storage_enabled: !!data.storage_enabled,
      auth_enabled: !!data.auth_enabled,
      sso_app_key: data.sso_app_key,
      allowed_origins: data.allowed_origins ?? [],
    },
  };
}
