import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader, Panel } from "@/components/owner/PageShell";

type DbStatus = {
  ping: { ok: boolean; latencyMs: number; error?: string };
  migrations: Array<{ name: string; applied_at: string }>;
  counts: { tenants: number; users: number; projects: number; jobs: number; records: number };
};

export const Route = createFileRoute("/owner/health")({
  head: () => ({ meta: [{ title: "System Health — DB·GUARD" }] }),
  component: HealthPage,
});

function HealthPage() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/db-status");
      const j = (await r.json()) as { ok: boolean } & DbStatus;
      if (j.ok) setStatus(j);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="System Health" subtitle="حالة قاعدة البيانات والخدمات الأساسية."
        actions={
          <button onClick={load} disabled={loading}
            className="h-10 px-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 flex items-center gap-2 text-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </button>
        } />

      {!status ? (
        <Panel><p className="text-sm text-muted-foreground py-6">Loading…</p></Panel>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Panel>
              <div className="flex items-center gap-3">
                {status.ping.ok ? <CheckCircle2 className="h-8 w-8 text-success" /> : <AlertCircle className="h-8 w-8 text-destructive" />}
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Database</div>
                  <div className="text-xl font-bold">{status.ping.ok ? "Online" : "Offline"}</div>
                </div>
              </div>
              <div className="mt-3 text-xs font-mono text-muted-foreground">
                latency: {status.ping.latencyMs}ms{status.ping.error ? ` · ${status.ping.error}` : ""}
              </div>
            </Panel>

            {(["tenants", "users", "projects", "jobs", "records"] as const).map((k) => (
              <Panel key={k}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="text-3xl font-bold mt-1">{status.counts[k]}</div>
              </Panel>
            ))}
          </div>

          <Panel title="Migrations Applied" right={<Database className="h-4 w-4 text-muted-foreground" />}>
            {status.migrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد ترحيلات. شغّل: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">bun run scripts/migrate.ts</code>
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {status.migrations.map((m) => (
                  <li key={m.name} className="flex items-center justify-between py-2">
                    <span className="font-mono text-xs">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(m.applied_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
