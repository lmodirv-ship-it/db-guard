import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CyberCard, StatPill, PulseDot } from "@/components/dashboard/CyberCard";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { Terminal } from "@/components/dashboard/Terminal";
import {
  Database, Table2, FileText, KeyRound, ArrowRight, Cpu, HardDrive,
  Zap, TrendingUp, Activity, Globe2, Shield, Server, User, LogOut, Settings as SettingsIcon,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar,
  RadialBarChart, RadialBar,
} from "recharts";
import { timeSeries, activityFeed, regionalLoad, endpointTraffic } from "@/lib/mock/enterprise";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Control Center — DB·GUARD" }] }),
  component: Overview,
});

type Usage = {
  plan: { id: string; name: string; max_tables: number; max_records: number; max_storage_mb: number; max_api_keys: number; max_team: number };
  usage: { tables: number; records: number; api_keys: number; team: number };
};

function Overview() {
  const [data, setData] = useState<Usage | null>(null);
  const [series, setSeries] = useState(timeSeries(30, 920, 380, 17));
  const [feed] = useState(activityFeed());
  const regions = regionalLoad();
  const endpoints = endpointTraffic();

  useEffect(() => {
    fetch("/api/billing/usage").then((r) => r.json()).then((j) => j.ok && setData(j));
  }, []);

  // Simulate live metrics
  useEffect(() => {
    const id = setInterval(() => {
      setSeries((s) => {
        const last = s[s.length - 1];
        const next = {
          t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          requests: Math.max(200, Math.round(last.requests + (Math.random() - 0.5) * 220)),
          errors: Math.max(0, Math.round((Math.random() - 0.75) * 18)),
          latency: Math.max(20, Math.round(last.latency + (Math.random() - 0.5) * 15)),
        };
        return [...s.slice(-29), next];
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const totalRequests = series.reduce((a, b) => a + b.requests, 0);
  const avgLatency = Math.round(series.reduce((a, b) => a + b.latency, 0) / series.length);

  const kpis = [
    {
      label: "Databases", value: 1 + (data?.usage.tables ? 1 : 0), max: 5,
      icon: Database, tone: "primary",
      sub: `${data?.plan.name ?? "—"} plan`,
    },
    {
      label: "Tables", value: data?.usage.tables ?? 12, max: data?.plan.max_tables ?? 100,
      icon: Table2, tone: "accent",
      sub: "across 1 workspace",
    },
    {
      label: "Records", value: data?.usage.records ?? 48721, max: data?.plan.max_records ?? 1000000,
      icon: FileText, tone: "primary",
      sub: "+128 in last hour",
    },
    {
      label: "API Requests / 24h", value: totalRequests, max: 5_000_000,
      icon: Zap, tone: "accent",
      sub: `avg ${avgLatency}ms latency`,
    },
  ] as const;

  return (
    <DashboardShell title="Database Control Center">
      {/* Hero ribbon */}
      <CyberCard glow className="mb-6">
        <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PulseDot />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-success">All systems operational</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Welcome to your <span className="text-gradient">database universe</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.plan.name ?? "Free"} plan · Realtime · Multi-region · Enterprise grade.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/dashboard/tables" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 shadow-[0_0_30px_-10px_var(--primary)]">
              <Table2 className="h-4 w-4" /> Open tables
            </Link>
            <Link to="/dashboard/billing" className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-card px-4 py-2 text-sm font-medium hover:bg-primary/5">
              Upgrade <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </CyberCard>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          const pct = Math.min(100, (k.value / k.max) * 100);
          return (
            <CyberCard key={k.label}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{k.label}</div>
                    <div className="text-3xl font-bold mt-1.5 font-display">
                      <AnimatedCounter value={k.value} />
                    </div>
                  </div>
                  <div className={`rounded-lg p-2 ${k.tone === "primary" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground mb-2">{k.sub}</div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${k.tone === "primary" ? "bg-gradient-to-r from-primary to-primary-glow" : "bg-gradient-to-r from-accent to-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </CyberCard>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <CyberCard className="lg:col-span-2">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> API Activity
              </h3>
              <p className="text-xs text-muted-foreground">Live · last 30 minutes</p>
            </div>
            <div className="flex gap-2">
              <StatPill tone="success">{totalRequests.toLocaleString()} req</StatPill>
              <StatPill tone="primary">{avgLatency}ms p50</StatPill>
            </div>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.2 295)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.7 0.2 295)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.2 230)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.7 0.2 230)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: "oklch(0.7 0.02 260)" }} stroke="oklch(0.3 0.04 280 / 0.3)" />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.7 0.02 260)" }} stroke="oklch(0.3 0.04 280 / 0.3)" />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.03 270)", border: "1px solid oklch(0.7 0.2 295 / 0.3)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="requests" stroke="oklch(0.7 0.2 295)" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="latency" stroke="oklch(0.7 0.2 230)" strokeWidth={1.5} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CyberCard>

        <CyberCard>
          <div className="p-4 border-b border-primary/10">
            <h3 className="font-semibold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent" /> System Resources
            </h3>
            <p className="text-xs text-muted-foreground">node-01 · primary</p>
          </div>
          <div className="p-4 space-y-4">
            {[
              { l: "CPU", v: 42, max: 100, c: "from-primary to-primary-glow", icon: Cpu },
              { l: "Memory", v: 68, max: 100, c: "from-accent to-primary", icon: Server },
              { l: "Disk I/O", v: 31, max: 100, c: "from-success to-accent", icon: HardDrive },
              { l: "Net Throughput", v: 54, max: 100, c: "from-primary to-accent", icon: Activity },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.l}>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3 w-3" /> {s.l}</span>
                    <span className="font-mono">{s.v}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden relative">
                    <div className={`h-full bg-gradient-to-r ${s.c} relative`} style={{ width: `${s.v}%` }}>
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CyberCard>
      </div>

      {/* Endpoints + Regions */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <CyberCard className="lg:col-span-2">
          <div className="p-4 border-b border-primary/10">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Top API Endpoints
            </h3>
          </div>
          <div className="p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={endpoints} layout="vertical" margin={{ left: 90 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.7 0.02 260)" }} stroke="oklch(0.3 0.04 280 / 0.3)" />
                <YAxis type="category" dataKey="endpoint" tick={{ fontSize: 10, fill: "oklch(0.7 0.02 260)", fontFamily: "monospace" }} stroke="oklch(0.3 0.04 280 / 0.3)" width={140} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.03 270)", border: "1px solid oklch(0.7 0.2 295 / 0.3)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="calls" fill="oklch(0.7 0.2 295)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CyberCard>

        <CyberCard>
          <div className="p-4 border-b border-primary/10">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-accent" /> Edge Regions
            </h3>
          </div>
          <div className="p-4 space-y-2.5">
            {regions.map((r) => (
              <div key={r.region} className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PulseDot tone={r.status === "healthy" ? "success" : "warn"} />
                  <span className="font-mono text-xs">{r.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${r.load > 80 ? "bg-amber-400" : "bg-success"}`} style={{ width: `${r.load}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-end">{r.load}%</span>
                </div>
              </div>
            ))}
          </div>
        </CyberCard>
      </div>

      {/* Activity feed + Terminal */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <CyberCard>
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Recent Activity
            </h3>
            <StatPill tone="primary">live</StatPill>
          </div>
          <div className="p-2 max-h-[28rem] overflow-y-auto">
            {feed.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-primary/5 transition">
                <div className={`h-7 w-7 shrink-0 rounded-md grid place-items-center font-mono text-sm ${
                  e.kind === "alert" ? "bg-amber-500/15 text-amber-400" :
                  e.kind === "delete" ? "bg-destructive/15 text-destructive" :
                  e.kind === "auth" || e.kind === "login" ? "bg-accent/15 text-accent" :
                  "bg-primary/15 text-primary"
                }`}>{e.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{e.label}</div>
                  <div className="font-mono text-[11px] text-muted-foreground truncate">{e.target}</div>
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0 font-mono">{e.ago}</div>
              </div>
            ))}
          </div>
        </CyberCard>

        <CyberCard>
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-accent" /> Live Logs Stream
            </h3>
            <StatPill tone="success">streaming</StatPill>
          </div>
          <div className="p-3">
            <Terminal />
          </div>
        </CyberCard>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/dashboard/api-keys", t: "API Keys", d: "Generate keys", i: KeyRound },
          { to: "/dashboard/backups", t: "Backups", d: "Snapshots & restore", i: Server },
          { to: "/dashboard/security", t: "Security", d: "Audit & policies", i: Shield },
          { to: "/dashboard/api-explorer", t: "API Explorer", d: "Run live queries", i: Zap },
        ].map((q) => {
          const Icon = q.i;
          return (
            <Link key={q.to} to={q.to} className="group rounded-xl border border-border bg-card/50 p-4 hover:border-primary/40 hover:bg-card transition-all hover:-translate-y-0.5">
              <Icon className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-medium text-sm">{q.t}</div>
              <div className="text-xs text-muted-foreground">{q.d}</div>
            </Link>
          );
        })}
      </div>

      {/* Hidden radial keeps recharts tree-shaking off the unused symbol */}
      <div className="hidden">
        <RadialBarChart width={1} height={1} data={[{ v: 1 }]}><RadialBar dataKey="v" /></RadialBarChart>
      </div>
    </DashboardShell>
  );
}
