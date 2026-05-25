import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CyberCard, StatPill } from "@/components/dashboard/CyberCard";
import { Play, Copy, Check, Terminal } from "lucide-react";

export const Route = createFileRoute("/dashboard/api-explorer")({
  head: () => ({ meta: [{ title: "API Explorer — DB·GUARD" }] }),
  component: Page,
});

const SAMPLES = [
  { method: "GET", path: "/v1/tables" },
  { method: "GET", path: "/v1/tables/:id" },
  { method: "POST", path: "/v1/tables/:id/records" },
  { method: "PATCH", path: "/v1/records/:id" },
  { method: "DELETE", path: "/v1/records/:id" },
  { method: "POST", path: "/v1/query" },
];

function Page() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("/v1/tables");
  const [body, setBody] = useState(`{\n  "limit": 50\n}`);
  const [response, setResponse] = useState<string>(JSON.stringify(
    { ok: true, hint: "Click Run to simulate a request", endpoint: "/v1/tables" },
    null, 2,
  ));
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sql, setSql] = useState(`SELECT id, name, created_at\nFROM users\nWHERE active = true\nORDER BY created_at DESC\nLIMIT 25;`);

  function run() {
    setRunning(true);
    setTimeout(() => {
      const fake = {
        ok: true,
        method,
        url,
        latency_ms: Math.floor(Math.random() * 90 + 20),
        data: {
          tables: [
            { id: "tbl_users", name: "users", records: 12482 },
            { id: "tbl_orders", name: "orders", records: 4810 },
            { id: "tbl_events", name: "events", records: 188400 },
          ],
          page: 1,
          total: 12,
        },
      };
      setResponse(JSON.stringify(fake, null, 2));
      setRunning(false);
    }, 600);
  }

  function copy() {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <DashboardShell title="API Explorer">
      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <CyberCard className="lg:col-span-2">
          <div className="p-3 border-b border-primary/10 flex flex-wrap gap-2 items-center">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-md border border-border bg-input px-3 py-1.5 font-mono text-xs">
              {["GET", "POST", "PATCH", "DELETE"].map((m) => <option key={m}>{m}</option>)}
            </select>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1 min-w-[200px] rounded-md border border-border bg-input px-3 py-1.5 font-mono text-xs" />
            <button onClick={run} disabled={running} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50">
              <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run"}
            </button>
          </div>
          <div className="grid grid-cols-2 divide-x divide-primary/10">
            <div className="p-0">
              <div className="px-3 py-2 border-b border-primary/10 font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Request body</div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full h-72 bg-transparent px-3 py-2 font-mono text-xs resize-none focus:outline-none" />
            </div>
            <div className="p-0">
              <div className="px-3 py-2 border-b border-primary/10 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Response</span>
                <button onClick={copy} className="text-muted-foreground hover:text-foreground">
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <pre className="h-72 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed text-success/90">{response}</pre>
            </div>
          </div>
        </CyberCard>

        <CyberCard>
          <div className="p-3 border-b border-primary/10 font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Endpoints</div>
          <div className="p-2 space-y-0.5">
            {SAMPLES.map((s) => (
              <button
                key={s.path + s.method}
                onClick={() => { setMethod(s.method); setUrl(s.path); }}
                className="w-full text-start flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary/5"
              >
                <span className={`font-mono text-[10px] uppercase rounded px-1.5 py-0.5 ${
                  s.method === "GET" ? "bg-accent/15 text-accent" :
                  s.method === "POST" ? "bg-success/15 text-success" :
                  s.method === "PATCH" ? "bg-amber-500/15 text-amber-400" :
                  "bg-destructive/15 text-destructive"
                }`}>{s.method}</span>
                <span className="font-mono text-xs truncate">{s.path}</span>
              </button>
            ))}
          </div>
        </CyberCard>
      </div>

      <CyberCard>
        <div className="p-3 border-b border-primary/10 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Terminal className="h-4 w-4 text-primary" /> SQL Query Console</h3>
          <StatPill tone="primary">read-only</StatPill>
        </div>
        <textarea value={sql} onChange={(e) => setSql(e.target.value)} className="w-full h-44 bg-[oklch(0.1_0.02_270)] px-4 py-3 font-mono text-sm resize-none focus:outline-none" />
        <div className="px-3 py-2 border-t border-primary/10 flex justify-end gap-2">
          <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Format</button>
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground inline-flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" /> Execute
          </button>
        </div>
      </CyberCard>
    </DashboardShell>
  );
}
