import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Activity, Database, Cpu, AlertTriangle, Globe, PlayCircle, RefreshCw } from "lucide-react";

type Health = {
  database: { ok: boolean; latency_ms: number };
  queue: { queued: number; running: number; failed: number };
  workers: Array<{ id: string; status: string; last_beat_at: string; stale: boolean }>;
  sites: { total: number; active_24h: number };
  events_5m: number;
  errors_5m: number;
  requests_5m: number;
  uptime_seconds: number;
};

type EventRow = {
  id: string;
  type: string;
  severity: "info" | "warn" | "error";
  source: string | null;
  site_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type Job = {
  id: string; kind: string; status: string; attempts: number; max_attempts: number;
  last_error: string | null; created_at: string;
};

export const Route = createFileRoute("/runtime/")({
  head: () => ({ meta: [{ title: "Runtime Overview — HN-DB" }] }),
  component: RuntimePage,
});

function RuntimePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [jobs, setJobs] = useState<{ jobs: Job[]; stats: Record<string, number> }>({ jobs: [], stats: {} });
  const [ticking, setTicking] = useState(false);

  async function refresh() {
    const [h, e, j] = await Promise.all([
      fetch("/api/hn/runtime/health").then((r) => r.json()),
      fetch("/api/hn/runtime/events?limit=80").then((r) => r.json()),
      fetch("/api/hn/runtime/jobs?limit=30").then((r) => r.json()),
    ]);
    if (h.ok) setHealth(h);
    if (e.ok) setEvents(e.events);
    if (j.ok) setJobs({ jobs: j.jobs, stats: j.stats });
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, []);

  async function tick() {
    setTicking(true);
    await fetch("/api/hn/runtime/worker/tick", { method: "POST" });
    await refresh();
    setTicking(false);
  }

  async function enqueueDemo() {
    await fetch("/api/hn/runtime/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "generic", payload: { demo: true, at: Date.now() } }),
    });
    await refresh();
  }

  return (
    <DashboardShell title="Runtime Platform">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Live infrastructure view — events, queue, workers, monitoring.</p>
          <div className="flex gap-2">
            <button onClick={enqueueDemo} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted flex items-center gap-1.5">
              <PlayCircle className="h-3.5 w-3.5" /> Enqueue demo job
            </button>
            <button onClick={tick} disabled={ticking} className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${ticking ? "animate-spin" : ""}`} /> Tick worker
            </button>
          </div>
        </div>

        {/* Health grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Database} label="Database" value={health ? `${health.database.latency_ms}ms` : "…"} sub={health?.database.ok ? "healthy" : "down"} ok={health?.database.ok} />
          <StatCard icon={Activity} label="Requests / 5m" value={health ? String(health.requests_5m) : "…"} sub={`${health?.events_5m ?? 0} events`} />
          <StatCard icon={AlertTriangle} label="Errors / 5m" value={health ? String(health.errors_5m) : "…"} sub={health && health.errors_5m > 0 ? "investigate" : "clean"} ok={!!health && health.errors_5m === 0} />
          <StatCard icon={Globe} label="Active sites" value={health ? `${health.sites.active_24h}/${health.sites.total}` : "…"} sub="last 24h" />
        </div>

        {/* Queue + workers */}
        <div className="grid md:grid-cols-2 gap-4">
          <Panel title="Queue">
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {(["queued","running","delayed","done","failed"] as const).map((k) => (
                <div key={k} className="rounded border border-border p-2">
                  <div className="text-muted-foreground uppercase tracking-wider text-[10px]">{k}</div>
                  <div className="text-lg font-mono">{jobs.stats[k] ?? 0}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 max-h-56 overflow-auto rounded border border-border divide-y divide-border">
              {jobs.jobs.length === 0 && <div className="p-3 text-xs text-muted-foreground">No jobs yet.</div>}
              {jobs.jobs.map((j) => (
                <div key={j.id} className="px-3 py-1.5 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={j.status} />
                    <span className="font-mono">{j.kind}</span>
                    <span className="text-muted-foreground">{j.attempts}/{j.max_attempts}</span>
                  </div>
                  <span className="text-muted-foreground">{new Date(j.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Workers">
            <div className="space-y-1.5">
              {(!health || health.workers.length === 0) && <div className="text-xs text-muted-foreground">No worker heartbeats yet. Click "Tick worker".</div>}
              {health?.workers.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-xs rounded border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5" />
                    <span className="font-mono">{w.id}</span>
                    <span className={`px-1.5 rounded text-[10px] ${w.stale ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"}`}>
                      {w.stale ? "stale" : w.status}
                    </span>
                  </div>
                  <span className="text-muted-foreground">{new Date(w.last_beat_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              Uptime: {health ? `${Math.floor(health.uptime_seconds / 60)}m` : "…"}
            </div>
          </Panel>
        </div>

        {/* Live activity feed */}
        <Panel title="Live Activity Feed">
          <div className="max-h-[420px] overflow-auto font-mono text-[11px] divide-y divide-border">
            {events.length === 0 && <div className="p-3 text-muted-foreground">Waiting for events…</div>}
            {events.map((e) => (
              <div key={e.id} className="grid grid-cols-[80px_90px_140px_1fr] gap-3 px-2 py-1.5 hover:bg-muted/40">
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                <SeverityBadge s={e.severity} />
                <span className="text-primary">{e.type}</span>
                <span className="text-muted-foreground truncate">{JSON.stringify(e.payload)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <p className="text-xs text-muted-foreground">
          Visit <Link to="/runtime/sites/$slug" params={{ slug: "your-site-slug" }} className="underline">/runtime/sites/&lt;slug&gt;</Link> for per-site runtime.
        </p>
      </div>
    </DashboardShell>
  );
}

function StatCard({ icon: Icon, label, value, sub, ok }: { icon: typeof Activity; label: string; value: string; sub?: string; ok?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-2 text-2xl font-mono">{value}</div>
      {sub && <div className={`text-[11px] mt-0.5 ${ok === false ? "text-destructive" : ok ? "text-primary" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{title}</div>
      {children}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const c =
    status === "done" ? "bg-primary" :
    status === "running" ? "bg-yellow-500 animate-pulse" :
    status === "failed" ? "bg-destructive" :
    status === "delayed" ? "bg-blue-500" :
    "bg-muted-foreground";
  return <span className={`inline-block h-2 w-2 rounded-full ${c}`} />;
}

function SeverityBadge({ s }: { s: "info" | "warn" | "error" }) {
  const cls = s === "error" ? "text-destructive" : s === "warn" ? "text-yellow-500" : "text-muted-foreground";
  return <span className={cls}>{s.padEnd(5)}</span>;
}
