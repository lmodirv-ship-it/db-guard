/**
 * HN Sites — auto-discover and register a site from its URL only.
 *
 *   POST /api/hn/sites/discover  { url, slug?, name? }
 *
 * Fetches the URL with multiple safe probes (HEAD, GET /, robots.txt,
 * sitemap.xml, /.well-known/hn-bd, favicon) and stores a full discovery
 * report. Creates an hn_sites row + an issued API key, and returns the
 * recommended integration snippet.
 *
 * Auth: HN bearer token (Authorization: Bearer hns_...)
 * Permission: site.write
 */
import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { requireHnAccess, hnAccessErrorResponse } from "@/lib/hn/access.server";
import { withTenant } from "@/lib/db/tenant.server";
import { ensureOwnerWorkspace } from "@/lib/hn/workspaces.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-HN-Token, Content-Type",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

const Schema = z.object({
  url: z.string().trim().min(4).max(2048),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,60}$/).optional(),
  name: z.string().trim().min(1).max(120).optional(),
});

function normalizeUrl(input: string): URL | null {
  try {
    let u = input.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    const url = new URL(u);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url;
  } catch { return null; }
}

function slugFromHost(host: string): string {
  return host.replace(/^www\./, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 50) || "site";
}

function randToken(len = 24): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function safeFetch(url: string, init?: RequestInit, timeoutMs = 7000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal, redirect: "follow" });
    return { ok: true as const, response: r };
  } catch (e) {
    return { ok: false as const, error: String((e as Error).message || e) };
  } finally {
    clearTimeout(t);
  }
}

function pickMeta(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1].trim().slice(0, 500) : null;
}

function detectFramework(html: string, headers: Record<string, string>): string | null {
  const h = (k: string) => headers[k.toLowerCase()] || "";
  if (h("x-powered-by").toLowerCase().includes("next")) return "Next.js";
  if (/__NEXT_DATA__/.test(html)) return "Next.js";
  if (/<div id="root">/.test(html) && /react/i.test(html)) return "React";
  if (/<div id="app">/.test(html) && /vue/i.test(html)) return "Vue";
  if (/data-svelte/.test(html)) return "Svelte";
  if (/wp-content|wp-includes/.test(html)) return "WordPress";
  if (/cdn\.shopify\.com|Shopify\.theme/.test(html)) return "Shopify";
  if (/<meta name="generator" content="([^"]+)"/i.test(html)) {
    return RegExp.$1.split(" ")[0];
  }
  return null;
}

async function discoverSite(rawUrl: string) {
  const url = normalizeUrl(rawUrl);
  if (!url) return { ok: false as const, reason: "invalid_url" };

  const origin = url.origin;
  const host = url.hostname.toLowerCase();
  const report: Record<string, unknown> = {
    url: url.toString(),
    origin,
    host,
    ssl: url.protocol === "https:",
    reachable: false,
    cors_blocked: false,
  };

  // 1) GET /
  const main = await safeFetch(origin + "/", {
    headers: { "User-Agent": "HN-DB Discovery (+https://hn-bd.online)" },
  });

  if (!main.ok) {
    report.reachable = false;
    report.error = main.error;
    return { ok: true as const, report };
  }
  const r = main.response;
  report.reachable = true;
  report.status_code = r.status;

  const headers: Record<string, string> = {};
  r.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  report.headers = {
    server: headers["server"] || null,
    content_type: headers["content-type"] || null,
    x_powered_by: headers["x-powered-by"] || null,
    cache_control: headers["cache-control"] || null,
    strict_transport_security: headers["strict-transport-security"] || null,
  };
  report.cors = {
    allow_origin: headers["access-control-allow-origin"] || null,
    allow_credentials: headers["access-control-allow-credentials"] || null,
  };

  let html = "";
  try {
    if ((headers["content-type"] || "").includes("text/html")) {
      html = (await r.text()).slice(0, 250_000); // cap 250kb
    }
  } catch (e) {
    report.cors_blocked = true;
    report.read_error = String(e);
  }

  if (html) {
    report.title = pickMeta(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    report.description = pickMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    report.og_image = pickMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    report.favicon = pickMeta(html, /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
      || "/favicon.ico";
    report.framework = detectFramework(html, headers);
    report.has_hn_js = /hn-bd\.online\/hn\.js/i.test(html);
    const slugMatch = html.match(/data-site=["']([a-z0-9_-]+)["']/i);
    report.detected_site_slug = slugMatch ? slugMatch[1] : null;
  } else {
    report.cors_blocked = report.cors_blocked || true;
  }

  // 2) robots.txt + sitemap.xml + .well-known
  const [robots, sitemap, wk] = await Promise.all([
    safeFetch(origin + "/robots.txt", undefined, 4000),
    safeFetch(origin + "/sitemap.xml", undefined, 4000),
    safeFetch(origin + "/.well-known/hn-bd", undefined, 4000),
  ]);
  report.robots_txt = robots.ok ? { status: robots.response.status, found: robots.response.ok } : { found: false };
  report.sitemap_xml = sitemap.ok ? { status: sitemap.response.status, found: sitemap.response.ok } : { found: false };
  report.well_known_hn = wk.ok ? { status: wk.response.status, found: wk.response.ok } : { found: false };

  return { ok: true as const, report };
}

export const Route = createFileRoute("/api/hn/sites/discover")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const ctx = await requireHnAccess(request, "site.write");
          let body: unknown;
          try { body = await request.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return json(400, { ok: false, error: "invalid_input", issues: parsed.error.issues });

          const url = normalizeUrl(parsed.data.url);
          if (!url) return json(400, { ok: false, error: "invalid_url" });

          const result = await discoverSite(parsed.data.url);
          if (!result.ok) return json(400, { ok: false, error: result.reason });
          const report = result.report;

          // Pick / generate slug
          const baseSlug = parsed.data.slug || slugFromHost(url.hostname);
          let slug = baseSlug;
          for (let i = 0; i < 5; i++) {
            const exists = await withTenant<{ id: string }>(ctx.tenantId, (sql) => sql`
              SELECT id FROM hn_sites WHERE LOWER(slug) = ${slug} LIMIT 1
            `);
            if (!exists.length) break;
            slug = baseSlug + "-" + Math.random().toString(36).slice(2, 6);
          }

          const verificationToken = "hnv_" + randToken(24);
          const name = parsed.data.name || (report.title as string | null) || url.hostname.replace(/^www\./, "");

          // Ensure tenant has a default workspace (auto-create if missing).
          const workspace = await ensureOwnerWorkspace(ctx.tenantId);
          const workspaceId = workspace.id;

          // Insert site
          const allowedOrigins = [url.origin];
          if (url.hostname.startsWith("www.")) allowedOrigins.push(url.origin.replace("://www.", "://"));
          else allowedOrigins.push(url.origin.replace("://", "://www."));

          const inserted = await withTenant<{
            id: string; slug: string; name: string; site_host: string;
            site_url: string; allowed_origins: string[];
          }>(ctx.tenantId, (sql) => sql`
            INSERT INTO hn_sites (
              tenant_id, workspace_id, slug, name, site_host, site_url,
              allowed_origins, discovery, verification_token, verification_method,
              db_enabled, auth_enabled, storage_enabled
            )
            VALUES (
              ${ctx.tenantId}, ${workspaceId}, ${slug}, ${name}, ${url.hostname.toLowerCase()},
              ${url.origin}, ${allowedOrigins}, ${JSON.stringify(report)}::jsonb,
              ${verificationToken}, 'script', TRUE, TRUE, FALSE
            )
            RETURNING id, slug, name, site_host, site_url, allowed_origins
          `);
          const site = inserted[0];

          // Issue a site key (returned ONCE)
          const rawKey = "hnk_" + randToken(28);
          const keyHash = await sha256Hex(rawKey);
          await withTenant(ctx.tenantId, (sql) => sql`
            INSERT INTO hn_site_keys (tenant_id, site_id, key_prefix, key_hash, label, scopes)
            VALUES (${ctx.tenantId}, ${site.id}, ${rawKey.slice(0, 8)}, ${keyHash},
                    'auto-generated', ARRAY['db.read','db.write']::TEXT[])
          `);

          const snippet = `<script src="https://hn-bd.online/hn.js" data-site="${site.slug}"></script>`;

          return json(200, {
            ok: true,
            site: {
              ...site,
              verification: {
                token: verificationToken,
                methods: {
                  script: snippet,
                  meta_tag: `<meta name="hn-site-verification" content="${verificationToken}" />`,
                  dns_txt: { record: `_hn-bd.${url.hostname}`, type: "TXT", value: verificationToken },
                  well_known: {
                    path: "/.well-known/hn-bd",
                    contents: `site=${site.slug}\ntoken=${verificationToken}\n`,
                  },
                },
              },
              api_key: rawKey,
              snippet,
              recommended_method: (report as { has_hn_js?: boolean }).has_hn_js ? "already_installed" : "script",
            },
            discovery: report,
          });
        } catch (err) {
          return hnAccessErrorResponse(err);
        }
      },
    },
  },
});
