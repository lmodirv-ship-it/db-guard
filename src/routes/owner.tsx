import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  LayoutDashboard, FolderKanban, Database, Activity, Files,
  Users, UserCog, ShieldCheck, KeyRound,
  ScrollText, BellRing, HeartPulse,
  Plug, Settings as SettingsIcon,
  Search, Bell, HelpCircle, Sun, ChevronDown, Plus, Calendar,
  Cloud, Server, HardDrive, ListChecks, FileText, FolderPlus, LogIn, CheckCircle2,
  Sparkles, Building2,
} from "lucide-react";
import { Logo } from "@/components/Logo";

type Me = { id: string; email: string; tenantId: string };
type DbStatus = {
  ping: { ok: boolean; latencyMs: number; error?: string };
  migrations: Array<{ name: string; applied_at: string }>;
  counts: { tenants: number; users: number; projects: number; jobs: number; records: number };
};

export const Route = createFileRoute("/owner")({
  head: () => ({ meta: [{ title: "Owner Console — DB·GUARD" }] }),
  component: OwnerConsole,
});

type NavItem = { label: string; icon: React.ComponentType<{ className?: string }>; href?: string; active?: boolean };
type NavSection = { title?: string; items: NavItem[] };

const NAV: NavSection[] = [
  { items: [{ label: "Overview", icon: LayoutDashboard, active: true }] },
  { title: "Data Management", items: [
    { label: "Projects", icon: FolderKanban },
    { label: "Records", icon: Database },
    { label: "Jobs", icon: Activity },
    { label: "Files", icon: Files },
  ]},
  { title: "Access & Security", items: [
    { label: "Tenants", icon: Building2 },
    { label: "Users", icon: Users },
    { label: "Roles", icon: ShieldCheck },
    { label: "API Keys", icon: KeyRound },
  ]},
  { title: "Monitoring", items: [
    { label: "Audit Logs", icon: ScrollText },
    { label: "Alerts", icon: BellRing },
    { label: "System Health", icon: HeartPulse },
  ]},
  { title: "Settings", items: [
    { label: "Integrations", icon: Plug },
    { label: "Settings", icon: SettingsIcon },
  ]},
];

function OwnerConsole() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [status, setStatus] = useState<DbStatus | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      if (r.status === 401) { await navigate({ to: "/login" }); return; }
      const j = (await r.json()) as { ok: boolean; user?: Me };
      if (j.ok && j.user) setMe(j.user);
      const probe = await fetch("/api/admin/db-status");
      if (probe.status === 403) { setForbidden(true); return; }
      const js = await probe.json() as { ok: boolean } & DbStatus;
      if (js.ok) setStatus(js);
    })();
  }, [navigate]);

  if (forbidden) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-destructive">403 — Owner only</h1>
          <p className="mt-2 text-sm text-muted-foreground">هذه اللوحة متاحة فقط لمالك المنصة.</p>
          <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const counts = status?.counts ?? { tenants: 0, users: 0, projects: 0, jobs: 0, records: 0 };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Background ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 cyber-grid opacity-30" />
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[160px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-accent/20 blur-[160px]" />
      </div>

      <Sidebar email={me?.email} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 px-8 py-6 space-y-6">
          <WelcomeRow email={me?.email} />
          <StatsRow counts={counts} />
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3"><SystemOverview ping={status?.ping} /></div>
            <div className="lg:col-span-6"><ActivityChart /></div>
            <div className="lg:col-span-3"><RecentActivity email={me?.email} /></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8"><RecentProjects /></div>
            <div className="lg:col-span-4"><ResourceUsage counts={counts} /></div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ----- Sidebar ----- */
function Sidebar({ email }: { email?: string }) {
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card/40 backdrop-blur-xl flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Logo size={32} />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map((section, i) => (
          <div key={i}>
            {section.title && (
              <div className="px-3 mb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/70">
                {section.title}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((it) => {
                const Icon = it.icon;
                const cls = it.active
                  ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40";
                return (
                  <li key={it.label}>
                    <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${cls}`}>
                      <Icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition cursor-pointer">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-sm font-bold text-primary-foreground">
            {(email?.[0] ?? "O").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">Owner</div>
            <div className="text-[11px] text-muted-foreground truncate">{email ?? "owner@company.com"}</div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-primary/30 bg-primary/10 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-primary">Enterprise Plan</span>
        </div>
      </div>
    </aside>
  );
}

/* ----- Top bar ----- */
function TopBar() {
  return (
    <header className="h-16 border-b border-border bg-card/30 backdrop-blur-xl px-8 flex items-center gap-4">
      <div className="flex-1 max-w-xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search anything..."
          className="w-full h-10 rounded-xl bg-muted/40 border border-border pl-10 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-background/60 border border-border text-[10px] font-mono text-muted-foreground">⌘K</kbd>
      </div>
      <div className="flex items-center gap-2">
        <IconBtn><Sun className="h-4 w-4" /></IconBtn>
        <IconBtn badge="3"><Bell className="h-4 w-4" /></IconBtn>
        <IconBtn><HelpCircle className="h-4 w-4" /></IconBtn>
        <button className="h-10 px-3 rounded-xl border border-border bg-muted/40 hover:bg-muted/60 flex items-center gap-2 text-sm">
          <Database className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs">LMODIRV Tenant</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-sm font-bold text-primary-foreground">O</div>
      </div>
    </header>
  );
}

function IconBtn({ children, badge }: { children: React.ReactNode; badge?: string }) {
  return (
    <button className="relative h-10 w-10 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 grid place-items-center text-muted-foreground hover:text-foreground transition">
      {children}
      {badge && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground grid place-items-center">{badge}</span>
      )}
    </button>
  );
}

/* ----- Welcome ----- */
function WelcomeRow({ email }: { email?: string }) {
  return (
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
        <button className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-[0_0_30px_-6px_var(--primary)] hover:opacity-90">
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>
    </div>
  );
}

/* ----- Stats ----- */
function StatsRow({ counts }: { counts: DbStatus["counts"] }) {
  const items = [
    { label: "Tenants",  total: counts.tenants,  hint: "Total tenants",  Icon: Building2, color: "primary" },
    { label: "Users",    total: counts.users,    hint: "Total users",    Icon: Users,     color: "accent" },
    { label: "Projects", total: counts.projects, hint: "Total projects", Icon: FolderKanban, color: "primary" },
    { label: "Records",  total: counts.records,  hint: "Total records",  Icon: Database,  color: "accent" },
    { label: "Jobs",     total: counts.jobs,     hint: "Total jobs",     Icon: Activity,  color: "primary" },
    { label: "Storage",  total: "0 B",            hint: "Total storage",  Icon: Cloud,     color: "accent" },
  ] as const;
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {items.map((s) => <StatCard key={s.label} {...s} />)}
    </div>
  );
}

function StatCard({ label, total, hint, Icon, color }: {
  label: string; total: number | string; hint: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: "primary" | "accent";
}) {
  const ring = color === "primary" ? "from-primary/30 to-primary/5" : "from-accent/30 to-accent/5";
  const text = color === "primary" ? "text-primary" : "text-accent";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 hover:border-primary/40 transition group">
      <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl opacity-40 bg-gradient-to-br ${ring}`} />
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${ring} grid place-items-center ring-1 ring-border`}>
          <Icon className={`h-5 w-5 ${text}`} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{total}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
      <div className="mt-2 text-[11px] text-success flex items-center gap-1">↑ 0% <span className="text-muted-foreground">vs last 7 days</span></div>
    </div>
  );
}

/* ----- System overview ----- */
function SystemOverview({ ping }: { ping?: DbStatus["ping"] }) {
  const services = [
    { name: "Database", icon: Database, online: ping?.ok ?? true },
    { name: "Storage",  icon: HardDrive, online: true },
    { name: "Queue",    icon: ListChecks, online: true },
    { name: "API",      icon: Server,    online: true },
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
      <button className="mt-4 w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 flex items-center justify-center gap-2">
        View System Health <Activity className="h-4 w-4" />
      </button>
    </Panel>
  );
}

/* ----- Activity chart ----- */
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
          <Legend color="primary" label="Records" />
          <Legend color="accent" label="Jobs" />
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
              labelStyle={{ color: "oklch(0.97 0.01 260)" }}
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

function Legend({ color, label }: { color: "primary" | "accent"; label: string }) {
  const c = color === "primary" ? "bg-primary" : "bg-accent";
  return <span className="flex items-center gap-1.5 text-muted-foreground"><span className={`h-2 w-2 rounded-full ${c}`} />{label}</span>;
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

/* ----- Recent activity ----- */
function RecentActivity({ email }: { email?: string }) {
  const items = [
    { Icon: LogIn, title: "User login", sub: email ?? "owner@company.com", time: "2m ago" },
    { Icon: CheckCircle2, title: "System health check", sub: "All systems operational", time: "5m ago" },
    { Icon: Activity, title: "Job completed", sub: "Data import job completed", time: "15m ago" },
    { Icon: FileText, title: "Record created", sub: "New record added", time: "25m ago" },
    { Icon: FolderPlus, title: "Project created", sub: "New project created", time: "1h ago" },
  ];
  return (
    <Panel title="Recent Activity" right={<button className="text-xs text-primary hover:underline">View all</button>}>
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

/* ----- Recent projects ----- */
function RecentProjects() {
  return (
    <Panel title="Recent Projects" right={<button className="text-xs text-primary hover:underline">View all</button>}>
      <div className="grid grid-cols-6 px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Project Name</span><span>Tenant</span><span>Records</span><span>Storage</span><span>Status</span><span>Updated</span>
      </div>
      <div className="border-t border-border pt-10 pb-6 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-2xl bg-muted/40 grid place-items-center mb-3">
          <FolderKanban className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-sm font-semibold">No projects yet</div>
        <div className="text-xs text-muted-foreground mt-1">Create your first project to get started.</div>
        <button className="mt-4 h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-[0_0_24px_-6px_var(--primary)] hover:opacity-90">
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>
    </Panel>
  );
}

/* ----- Resource usage ----- */
function ResourceUsage({ counts }: { counts: DbStatus["counts"] }) {
  const items = [
    { Icon: Database, label: "Database",     pct: 12, value: "120 MB / 1 GB" },
    { Icon: HardDrive, label: "Storage",     pct: 0,  value: "0 B / 100 GB" },
    { Icon: ListChecks, label: "Queue",      pct: 5,  value: `${counts.jobs} / 1K jobs` },
    { Icon: Activity, label: "API Requests", pct: 8,  value: "800 / 10K req" },
  ];
  return (
    <Panel title="Resource Usage" right={<button className="text-xs text-primary hover:underline">View details</button>}>
      <ul className="space-y-4">
        {items.map((it) => (
          <li key={it.label}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-2"><it.Icon className="h-4 w-4 text-muted-foreground" />{it.label}</span>
              <span className="text-xs text-muted-foreground">{it.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${Math.max(2, it.pct)}%` }}
              />
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground text-right">{it.pct}%</div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ----- Generic panel ----- */
function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5 hover:border-primary/30 transition">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
