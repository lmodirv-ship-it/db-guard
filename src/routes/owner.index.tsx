import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  FolderKanban, Database, Activity, Users, Cloud, Server, HardDrive, ListChecks,
  FileText, FolderPlus, LogIn, CheckCircle2, Plus, Calendar, Building2,
} from "lucide-react";
import { Panel } from "@/components/owner/PageShell";

type DbStatus = {
  ping: { ok: boolean; latencyMs: number; error?: string };
  migrations: Array<{ name: string; applied_at: string }>;
  counts: { tenants: number; users: number; projects: number; jobs: number; records: number };
};

export const Route = createFileRoute("/owner/")({
  component: Overview,
});

function Overview() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [email, setEmail] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      if (me?.user?.email) setEmail(me.user.email);
      const r = await fetch("/api/admin/db-status");
      const j = await r.json() as { ok: boolean } & DbStatus;
      if (j.ok) setStatus(j);
    })();
  }, []);

  const counts = status?.counts ?? { tenants: 0, users: 0, projects: 0, jobs: 0, records: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, Owner <span className="inline-block animate-pulse-glow">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your platform today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 flex items-center gap-2 text-sm">
            <span>Last 7 days</span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </button>
          <Link to="/owner/projects" className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-[0_0_30px_-6px_var(--primary)] hover:opacity-90">
            <Plus className="h-4 w-4" /> New Project
          </Link>
        </div>
      </div>

      <StatsRow counts={counts} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3"><SystemOverview ping={status?.ping} /></div>
        <div className="lg:col-span-6"><ActivityChart /></div>
        <div className="lg:col-span-3"><RecentActivity email={email} /></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8"><RecentProjects /></div>
        <div className="lg:col-span-4"><ResourceUsage counts={counts} /></div>
      </div>
    </div>
  );
}

function StatsRow({ counts }: { counts: DbStatus["counts"] }) {
  const items = [
    { label: "Tenants",  total: counts.tenants,  hint: "Total tenants",  Icon: Building2,    color: "primary" as const },
    { label: "Users",    total: counts.users,    hint: "Total users",    Icon: Users,        color: "accent"  as const },
    { label: "Projects", total: counts.projects, hint: "Total projects", Icon: FolderKanban, color: "primary" as const },
    { label: "Records",  total: counts.records,  hint: "Total records",  Icon: Database,     color: "accent"  as const },
    { label: "Jobs",     total: counts.jobs,     hint: "Total jobs",     Icon: Activity,     color: "primary" as const },
    { label: "Storage",  total: "0 B",            hint: "Total storage",  Icon: Cloud,        color: "accent"  as const },
  ];
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {items.map((s) => {
        const ring = s.color === "primary" ? "from-primary/30 to-primary/5" : "from-accent/30 to-accent/5";
        const text = s.color === "primary" ? "text-primary" : "text-accent";
        return (
          <div key={s.label} className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 hover:border-primary/40 transition group">
            <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl opacity-40 bg-gradient-to-br ${ring}`} />
            <div className="flex items-start justify-between">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${ring} grid place-items-center ring-1 ring-border`}>
                <s.Icon className={`h-5 w-5 ${text}`} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{s.total}</div>
            <div className="text-[11px] text-muted-foreground">{s.hint}</div>
            <div className="mt-2 text-[11px] text-success">↑ 0% <span className="text-muted-foreground">vs last 7 days</span></div>
          </div>
        );
      })}
    </div>
  );
}

function SystemOverview({ ping }: { ping?: DbStatus["ping"] }) {
  const services = [
    { name: "Database", icon: Database,   online: ping?.ok ?? true },
    { name: "Storage",  icon: HardDrive,  online: true },
    { name: "Queue",    icon: ListChecks, online: true },
    { name: "API",      icon: Server,     online: true },
  ];
  return (
    <Panel title="System Overview">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <div>
          <div className="text-sm font-semibold">All Systems Operational</div>
          <div className="text-[11px] text-muted-foreground">Everything is running smoothly</div>
        </div>
      </div>
      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s.name} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
            <span className="flex items-center gap-2"><s.icon className="h-4 w-4 text-muted-foreground" />{s.name}</span>
            <span className={`flex items-center gap-1.5 text-xs ${s.online ? "text-success" : "text-destructive"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.online ? "bg-success" : "bg-destructive"}`} />
              {s.online ? "Online" : "Offline"}
            </span>
          </li>
        ))}
      </ul>
      <Link to="/owner/health" className="mt-4 w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 flex items-center justify-center gap-2">
        View System Health <Activity className="h-4 w-4" />
      </Link>
    </Panel>
  );
}

function ActivityChart() {
  const data = useMemo(() => {
    const days = ["May 6", "May 7", "May 8", "May 9", "May 10", "May 11", "May 12"];
    return days.map((d, i) => ({
      day: d,
      records: [40, 55, 50, 70, 65, 75, 78][i],
      jobs: [15, 22, 18, 25, 20, 18, 28][i],
    }));
  }, []);
  return (
    <Panel
      title="Activity Overview"
      right={
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />Records</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-accent" />Jobs</span>
        </div>
      }
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"  stopColor="oklch(0.62 0.27 295)" />
                <stop offset="100%" stopColor="oklch(0.72 0.22 295)" />
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"  stopColor="oklch(0.7 0.2 230)" />
                <stop offset="100%" stopColor="oklch(0.78 0.18 220)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.04 280 / 0.3)" />
            <XAxis dataKey="day" stroke="oklch(0.7 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "oklch(0.18 0.03 270)", border: "1px solid oklch(0.3 0.04 280 / 0.5)", borderRadius: 12, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="records" stroke="url(#g1)" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="jobs"    stroke="url(#g2)" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Mini label="Total Records" value="120" delta="↑ 12%" />
        <Mini label="Total Jobs"    value="45"  delta="↑ 8%" />
        <Mini label="Success Rate"  value="23"  delta="↑ 5%" />
        <Mini label="Avg. Response" value="120" suffix="ms" delta="↓ 2%" />
      </div>
    </Panel>
  );
}

function Mini({ label, value, suffix, delta }: { label: string; value: string; suffix?: string; delta: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold">{value}</span>
        {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-[11px] text-success">{delta}</div>
    </div>
  );
}

function RecentActivity({ email }: { email?: string }) {
  const items = [
    { Icon: LogIn,         title: "User login",          sub: email ?? "owner@company.com",  time: "2m ago" },
    { Icon: CheckCircle2,  title: "System health check", sub: "All systems operational",     time: "5m ago" },
    { Icon: Activity,      title: "Job completed",       sub: "Data import job completed",   time: "15m ago" },
    { Icon: FileText,      title: "Record created",      sub: "New record added",            time: "25m ago" },
    { Icon: FolderPlus,    title: "Project created",     sub: "New project created",         time: "1h ago" },
  ];
  return (
    <Panel title="Recent Activity" right={<Link to="/owner/audit-logs" className="text-xs text-primary hover:underline">View all</Link>}>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted/40 grid place-items-center text-muted-foreground">
              <it.Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{it.title}</div>
              <div className="text-[11px] text-muted-foreground truncate">{it.sub}</div>
            </div>
            <span className="text-[11px] text-muted-foreground">{it.time}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RecentProjects() {
  return (
    <Panel title="Recent Projects" right={<Link to="/owner/projects" className="text-xs text-primary hover:underline">View all</Link>}>
      <div className="grid grid-cols-6 px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Project Name</span><span>Tenant</span><span>Records</span><span>Storage</span><span>Status</span><span>Updated</span>
      </div>
      <div className="border-t border-border pt-10 pb-6 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-2xl bg-muted/40 grid place-items-center mb-3">
          <FolderKanban className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-sm font-semibold">No projects yet</div>
        <div className="text-xs text-muted-foreground mt-1">Create your first project to get started.</div>
        <Link to="/owner/projects" className="mt-4 h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-[0_0_24px_-6px_var(--primary)] hover:opacity-90">
          <Plus className="h-4 w-4" /> New Project
        </Link>
      </div>
    </Panel>
  );
}

function ResourceUsage({ counts }: { counts: DbStatus["counts"] }) {
  const items = [
    { Icon: Database,   label: "Database",     pct: 12, value: "120 MB / 1 GB" },
    { Icon: HardDrive,  label: "Storage",      pct: 0,  value: "0 B / 100 GB" },
    { Icon: ListChecks, label: "Queue",        pct: 5,  value: `${counts.jobs} / 1K jobs` },
    { Icon: Activity,   label: "API Requests", pct: 8,  value: "800 / 10K req" },
  ];
  return (
    <Panel title="Resource Usage" right={<Link to="/owner/health" className="text-xs text-primary hover:underline">View details</Link>}>
      <ul className="space-y-4">
        {items.map((it) => (
          <li key={it.label}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-2"><it.Icon className="h-4 w-4 text-muted-foreground" />{it.label}</span>
              <span className="text-xs text-muted-foreground">{it.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.max(2, it.pct)}%` }} />
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground text-right">{it.pct}%</div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
