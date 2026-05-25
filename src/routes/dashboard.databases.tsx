import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CyberCard, StatPill, PulseDot } from "@/components/dashboard/CyberCard";
import { Database, Plus, Server, Globe2 } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { timeSeries } from "@/lib/mock/enterprise";

export const Route = createFileRoute("/dashboard/databases")({
  head: () => ({ meta: [{ title: "Databases — DB·GUARD" }] }),
  component: Page,
});

const dbs = [
  { id: "primary", name: "primary", region: "us-east-1", size: "4.2 GB", tables: 12, status: "healthy", primary: true },
  { id: "replica-eu", name: "replica-eu", region: "eu-west-1", size: "4.2 GB", tables: 12, status: "healthy", primary: false },
  { id: "analytics", name: "analytics", region: "us-east-1", size: "1.8 GB", tables: 6, status: "healthy", primary: false },
];

function Page() {
  return (
    <DashboardShell title="Databases">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">Workspaces, replicas, and analytic databases connected to your account.</p>
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 shadow-[0_0_30px_-10px_var(--primary)]">
          <Plus className="h-4 w-4" /> New database
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dbs.map((d, i) => {
          const series = timeSeries(20, 600 + i * 200, 200, i + 1);
          return (
            <CyberCard key={d.id} glow={d.primary}>
              <div className="p-4 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg p-1.5 bg-primary/15 text-primary"><Database className="h-4 w-4" /></div>
                  <div>
                    <div className="font-mono text-sm font-semibold">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Globe2 className="h-3 w-3" /> {d.region}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <PulseDot /> {d.primary && <StatPill tone="primary">primary</StatPill>}
                </div>
              </div>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id={`db-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.7 0.2 295)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="oklch(0.7 0.2 295)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="requests" stroke="oklch(0.7 0.2 295)" strokeWidth={1.5} fill={`url(#db-${i})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center border-t border-primary/10">
                <Stat l="Size" v={d.size} />
                <Stat l="Tables" v={d.tables.toString()} />
                <Stat l="Status" v={d.status} />
              </div>
              <div className="border-t border-primary/10 px-3 py-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"><Server className="h-3 w-3" /> node-0{i + 1}</span>
                <Link to="/dashboard/tables" className="text-xs text-primary hover:underline">Open →</Link>
              </div>
            </CyberCard>
          );
        })}
      </div>
    </DashboardShell>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{l}</div>
      <div className="text-sm font-semibold mt-0.5">{v}</div>
    </div>
  );
}
