import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Database, Table2, FileText, KeyRound, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — DB·GUARD" }] }),
  component: Overview,
});

type Usage = {
  plan: { id: string; name: string; max_tables: number; max_records: number; max_storage_mb: number; max_api_keys: number; max_team: number };
  usage: { tables: number; records: number; api_keys: number; team: number };
};

function Overview() {
  const [data, setData] = useState<Usage | null>(null);
  useEffect(() => {
    fetch("/api/billing/usage").then((r) => r.json()).then((j) => j.ok && setData(j));
  }, []);
  const stats = data ? [
    { l: "Tables", v: data.usage.tables, max: data.plan.max_tables, i: Table2 },
    { l: "Records", v: data.usage.records, max: data.plan.max_records, i: FileText },
    { l: "API Keys", v: data.usage.api_keys, max: data.plan.max_api_keys, i: KeyRound },
    { l: "Team", v: data.usage.team, max: data.plan.max_team, i: Database },
  ] : [];
  return (
    <DashboardShell title="Overview">
      <div className="mb-6 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary font-mono">Current Plan</div>
          <div className="text-2xl font-bold mt-1">{data?.plan.name ?? "…"}</div>
        </div>
        <Link to="/dashboard/billing" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Upgrade <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.i;
          const pct = s.max > 0 ? Math.min(100, (s.v / s.max) * 100) : 0;
          return (
            <div key={s.l} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{s.l}</span>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">{s.v.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">of {s.max.toLocaleString()}</div>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Link to="/dashboard/tables" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition">
          <Table2 className="h-6 w-6 text-primary mb-3" />
          <h3 className="font-semibold">Manage Tables</h3>
          <p className="text-sm text-muted-foreground mt-1">Create, edit, and delete tables and columns.</p>
        </Link>
        <Link to="/dashboard/api-keys" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition">
          <KeyRound className="h-6 w-6 text-primary mb-3" />
          <h3 className="font-semibold">API Keys</h3>
          <p className="text-sm text-muted-foreground mt-1">Generate keys to access your data programmatically.</p>
        </Link>
      </div>
    </DashboardShell>
  );
}
