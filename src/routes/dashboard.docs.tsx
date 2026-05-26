import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Copy, Check, BookOpen } from "lucide-react";

export const Route = createFileRoute("/dashboard/docs")({
  head: () => ({ meta: [{ title: "API Docs — DB·GUARD" }] }),
  component: Docs,
});

const BASE = "https://www.hn-bd.online/api";

type Sample = { method: string; path: string; title: string; body?: string; resp: string };

const SAMPLES: Sample[] = [
  {
    method: "GET", path: "/tables", title: "List tables",
    resp: `{
  "ok": true,
  "tables": [
    { "id": "uuid", "name": "customers", "description": null,
      "is_system": true, "column_count": 4, "record_count": 0,
      "created_at": "2026-05-26T20:00:00Z" }
  ]
}`,
  },
  {
    method: "POST", path: "/tables", title: "Create a table",
    body: `{ "name": "leads", "description": "Marketing leads",
  "columns": [
    { "name": "email", "data_type": "email", "is_required": true },
    { "name": "score", "data_type": "number" }
  ] }`,
    resp: `{ "ok": true, "table": { "id": "uuid", "name": "leads" } }`,
  },
  {
    method: "GET", path: "/tables/{id}/records?limit=50&offset=0&q=acme",
    title: "List records",
    resp: `{
  "ok": true,
  "total": 12,
  "records": [
    { "id": "uuid", "data": { "name": "Acme", "email": "x@y.z" },
      "created_at": "...", "updated_at": "..." }
  ]
}`,
  },
  {
    method: "POST", path: "/tables/{id}/records", title: "Insert a record",
    body: `{ "data": { "name": "Acme", "email": "x@y.z" } }`,
    resp: `{ "ok": true, "record": { "id": "uuid" } }`,
  },
  {
    method: "PATCH", path: "/records/{id}", title: "Update a record",
    body: `{ "data": { "score": 99 } }`,
    resp: `{ "ok": true }`,
  },
  {
    method: "DELETE", path: "/records/{id}", title: "Delete a record",
    resp: `{ "ok": true }`,
  },
];

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
    >
      {done ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function curlFor(s: Sample): string {
  const url = BASE + s.path.replace(/\?.*$/, ""); // strip query for cleaner curl
  const headers = `-H "Authorization: Bearer dbg_YOUR_KEY"`;
  if (s.body) {
    return `curl -X ${s.method} "${url}" \\
  ${headers} \\
  -H "Content-Type: application/json" \\
  -d '${s.body.replace(/\n\s*/g, " ")}'`;
  }
  return `curl -X ${s.method} "${url}" ${headers}`;
}

function Docs() {
  return (
    <DashboardShell title="API Documentation">
      <div className="space-y-8 max-w-4xl">
        {/* Intro */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">REST API</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect any app or backend to your DB·GUARD workspace using API keys.
            Every request is scoped to the tenant that owns the key.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground mb-1">Base URL</div>
              <code className="font-mono text-xs break-all">{BASE}</code>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground mb-1">Auth header</div>
              <code className="font-mono text-xs break-all">Authorization: Bearer dbg_…</code>
            </div>
          </div>
        </div>

        {/* Auth */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-2">1. Get an API key</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Go to <a href="/dashboard/api-keys" className="text-primary underline">API Keys</a>,
            click <strong>Generate</strong>, give it a name (e.g. <em>HN-Build</em>),
            and copy the key. It is shown <strong>once only</strong>.
          </p>
          <div className="rounded-md bg-background border border-border p-3 font-mono text-xs">
            dbg_AbCdEf123…
          </div>
        </section>

        {/* Endpoints */}
        <section>
          <h3 className="text-base font-semibold mb-3">2. Endpoints</h3>
          <div className="space-y-4">
            {SAMPLES.map((s) => {
              const curl = curlFor(s);
              return (
                <div key={s.method + s.path} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                        s.method === "GET" ? "bg-primary/15 text-primary" :
                        s.method === "POST" ? "bg-green-500/15 text-green-500" :
                        s.method === "PATCH" ? "bg-yellow-500/15 text-yellow-500" :
                        "bg-destructive/15 text-destructive"
                      }`}>{s.method}</span>
                      <code className="font-mono text-xs">{s.path}</code>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.title}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">curl</div>
                        <CopyBtn text={curl} />
                      </div>
                      <pre className="rounded-md bg-background border border-border p-3 text-xs overflow-x-auto font-mono whitespace-pre">{curl}</pre>
                    </div>
                    {s.body && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Body</div>
                        <pre className="rounded-md bg-background border border-border p-3 text-xs overflow-x-auto font-mono">{s.body}</pre>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Response</div>
                      <pre className="rounded-md bg-background border border-border p-3 text-xs overflow-x-auto font-mono">{s.resp}</pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Errors */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-3">Error format</h3>
          <pre className="rounded-md bg-background border border-border p-3 text-xs font-mono">{`{ "ok": false, "error": "invalid_api_key" }`}</pre>
          <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
            <div><code>401</code> unauthenticated / invalid_api_key</div>
            <div><code>402</code> plan_limit_records / plan_limit_tables</div>
            <div><code>404</code> not_found / table_not_found</div>
            <div><code>400</code> invalid_input / invalid_json</div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
