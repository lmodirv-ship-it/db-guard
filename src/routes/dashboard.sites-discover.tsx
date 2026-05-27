import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Globe, Loader2, CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";

type AnyObj = Record<string, unknown>;

export const Route = createFileRoute("/dashboard/sites-discover")({
  head: () => ({ meta: [{ title: "Add Site by URL — DB·GUARD" }] }),
  component: SitesDiscoverPage,
});

function SitesDiscoverPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnyObj | null>(null);
  const [discovery, setDiscovery] = useState<AnyObj | null>(null);

  async function discover() {
    setError(null); setResult(null); setDiscovery(null);
    if (!url.trim()) { setError("Enter a URL"); return; }
    const token = localStorage.getItem("hn_token");
    if (!token) {
      setError("No HN token in this browser. Login from /dashboard/sdk-test first.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/hn/sites/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-HN-Token": token,
        },
        body: JSON.stringify({ url: url.trim() }),
      });
      const j = (await r.json()) as AnyObj;
      if (!j.ok) {
        setError(String(j.error || "discovery_failed"));
      } else {
        setResult(j.site as AnyObj);
        setDiscovery(j.discovery as AnyObj);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <DashboardShell title="Add Site by URL">
      <div className="max-w-4xl space-y-6">
        <section className="rounded-lg border border-border bg-card/40 p-5">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" /> Discover & register a site
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Enter a public URL. HN-DB will fetch it, read its metadata, detect framework, check for hn.js,
            and create the site automatically — no code in the target site required.
          </p>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.hn-chat.com"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              onKeyDown={(e) => { if (e.key === "Enter") discover(); }}
            />
            <button
              onClick={discover}
              disabled={loading}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Discover
            </button>
          </div>
          {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
        </section>

        {discovery && <DiscoveryReport report={discovery} />}
        {result && <SiteResult site={result} onCopy={copy} />}
      </div>
    </DashboardShell>
  );
}

function Row({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-right break-all flex items-center gap-1.5 max-w-[60%]">
        {ok === true && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
        {ok === false && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
        {value}
      </span>
    </div>
  );
}

function DiscoveryReport({ report }: { report: AnyObj }) {
  const r = report as {
    reachable?: boolean; status_code?: number; ssl?: boolean; cors_blocked?: boolean;
    title?: string; description?: string; favicon?: string; og_image?: string; framework?: string;
    has_hn_js?: boolean; detected_site_slug?: string; headers?: AnyObj;
    robots_txt?: { found?: boolean }; sitemap_xml?: { found?: boolean }; well_known_hn?: { found?: boolean };
    host?: string; origin?: string;
  };
  return (
    <section className="rounded-lg border border-border bg-card/40 p-5">
      <h2 className="text-sm font-semibold mb-3">Discovery report</h2>
      <Row label="Reachable" value={r.reachable ? "yes" : "no"} ok={r.reachable} />
      <Row label="Status code" value={r.status_code ?? "—"} ok={r.status_code ? r.status_code < 400 : undefined} />
      <Row label="SSL" value={r.ssl ? "https" : "http"} ok={r.ssl} />
      <Row label="CORS blocked" value={r.cors_blocked ? "yes (limited scan)" : "no"} ok={!r.cors_blocked} />
      <Row label="Host" value={r.host || "—"} />
      <Row label="Title" value={r.title || "—"} />
      <Row label="Description" value={r.description || "—"} />
      <Row label="Favicon" value={r.favicon || "—"} />
      <Row label="OG image" value={r.og_image || "—"} />
      <Row label="Framework" value={r.framework || "unknown"} />
      <Row label="hn.js installed" value={r.has_hn_js ? `yes${r.detected_site_slug ? ` (data-site=${r.detected_site_slug})` : ""}` : "no"} ok={r.has_hn_js} />
      <Row label="robots.txt" value={r.robots_txt?.found ? "found" : "missing"} />
      <Row label="sitemap.xml" value={r.sitemap_xml?.found ? "found" : "missing"} />
      <Row label="/.well-known/hn-bd" value={r.well_known_hn?.found ? "found" : "missing"} ok={r.well_known_hn?.found} />
    </section>
  );
}

function SiteResult({ site, onCopy }: { site: AnyObj; onCopy: (s: string) => void }) {
  const s = site as {
    id: string; slug: string; name: string; site_host: string; site_url: string;
    api_key: string; snippet: string; recommended_method: string;
    verification: {
      token: string;
      methods: {
        script: string;
        meta_tag: string;
        dns_txt: { record: string; type: string; value: string };
        well_known: { path: string; contents: string };
      };
    };
  };

  return (
    <section className="rounded-lg border border-border bg-card/40 p-5 space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">Site registered ✓</h2>
          <div className="text-xs text-muted-foreground mt-0.5">{s.name} · {s.site_host}</div>
        </div>
        <a href={s.site_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
          open <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <Field label="site_slug" value={s.slug} onCopy={onCopy} />
        <Field label="site_id" value={s.id} onCopy={onCopy} />
        <Field label="api_key (shown once)" value={s.api_key} onCopy={onCopy} mono />
        <Field label="recommended" value={s.recommended_method} onCopy={onCopy} />
      </div>

      <Snippet title="Option 1 — Script tag (recommended)" code={s.snippet} onCopy={onCopy} />
      <Snippet title="Option 2 — Meta tag verification" code={s.verification.methods.meta_tag} onCopy={onCopy} />
      <Snippet
        title="Option 3 — DNS TXT record"
        code={`Name: ${s.verification.methods.dns_txt.record}\nType: ${s.verification.methods.dns_txt.type}\nValue: ${s.verification.methods.dns_txt.value}`}
        onCopy={onCopy}
      />
      <Snippet
        title={`Option 4 — Well-known file at ${s.verification.methods.well_known.path}`}
        code={s.verification.methods.well_known.contents}
        onCopy={onCopy}
      />
    </section>
  );
}

function Field({ label, value, onCopy, mono }: { label: string; value: string; onCopy: (s: string) => void; mono?: boolean }) {
  return (
    <div className="rounded border border-border px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <span className={"truncate " + (mono ? "font-mono" : "")}>{value}</span>
        <button onClick={() => onCopy(value)} className="text-muted-foreground hover:text-foreground shrink-0">
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Snippet({ title, code, onCopy }: { title: string; code: string; onCopy: (s: string) => void }) {
  return (
    <div className="rounded border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">{title}</span>
        <button onClick={() => onCopy(code)} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <Copy className="h-3 w-3" /> copy
        </button>
      </div>
      <pre className="text-[11px] font-mono whitespace-pre-wrap break-all bg-muted/40 rounded p-2">{code}</pre>
    </div>
  );
}
