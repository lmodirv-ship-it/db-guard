import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Database, Table2, FileText, KeyRound, Archive,
  Activity, Users, CreditCard, Settings, LogOut, Shield, Menu, Globe,
  Radio, Gauge, Terminal as TerminalIcon, HardDrive, Lock, User,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PulseDot } from "@/components/dashboard/CyberCard";

type NavItem = {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: string;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Control",
    items: [
      { to: "/dashboard", labelKey: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/dashboard/projects", labelKey: "Sites", icon: Globe },
      { to: "/dashboard/databases", labelKey: "Databases", icon: Database },
    ],
  },
  {
    title: "Data",
    items: [
      { to: "/dashboard/tables", labelKey: "Tables", icon: Table2 },
      { to: "/dashboard/records", labelKey: "Records", icon: FileText },
      { to: "/dashboard/api-explorer", labelKey: "API Explorer", icon: TerminalIcon },
      { to: "/dashboard/storage", labelKey: "Storage", icon: HardDrive },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/dashboard/realtime", labelKey: "Realtime", icon: Radio, badge: "live" },
      { to: "/dashboard/monitoring", labelKey: "Monitoring", icon: Gauge },
      { to: "/dashboard/logs", labelKey: "Logs", icon: Activity },
      { to: "/dashboard/backups", labelKey: "Backups", icon: Archive },
    ],
  },
  {
    title: "Workspace",
    items: [
      { to: "/dashboard/security", labelKey: "Security", icon: Lock },
      { to: "/dashboard/api-keys", labelKey: "API Keys", icon: KeyRound },
      { to: "/dashboard/team", labelKey: "Team", icon: Users },
      { to: "/dashboard/billing", labelKey: "Billing", icon: CreditCard },
      { to: "/dashboard/settings", labelKey: "Settings", icon: Settings },
    ],
  },
];

export function DashboardShell({ title, children }: { title: string; children: ReactNode }) {
  useTranslation();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [me, setMe] = useState<{ email?: string; tenantId: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      if (r.status === 401) { await navigate({ to: "/login" }); return; }
      const j = (await r.json()) as { ok: boolean; user?: { email: string; tenantId: string } };
      if (j.ok && j.user) setMe(j.user);
    })();
  }, [navigate]);

  useEffect(() => { setMobileOpen(false); }, [path]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await navigate({ to: "/login" });
  }

  const sidebar = (
    <>
      <div className="px-5 py-4 border-b border-primary/15 flex items-center gap-2.5 bg-gradient-to-br from-primary/10 to-transparent">
        <div className="relative">
          <Shield className="h-6 w-6 text-primary" />
          <span className="absolute -inset-1 rounded-full bg-primary/30 blur-md -z-10" />
        </div>
        <div className="leading-tight">
          <div className="font-brand text-sm font-bold tracking-[0.2em]">DB·GUARD</div>
          <div className="font-mono text-[9px] text-muted-foreground tracking-wider">CONTROL CENTER</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((g) => (
          <div key={g.title}>
            <div className="px-2 mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              {g.title}
            </div>
            <div className="space-y-0.5">
              {g.items.map((n) => {
                const active = n.exact ? path === n.to : path.startsWith(n.to);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all ${
                      active
                        ? "bg-primary/15 text-primary font-medium shadow-[inset_0_0_20px_-5px_var(--primary)]"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                    }`}
                  >
                    {active && <span className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />}
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{n.labelKey}</span>
                    {n.badge && (
                      <span className="font-mono text-[9px] uppercase rounded px-1.5 py-0.5 bg-success/15 text-success border border-success/30 flex items-center gap-1">
                        <PulseDot /> {n.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-primary/15 p-3 space-y-2 bg-card/40">
        <div className="rounded-md border border-success/20 bg-success/5 px-2.5 py-1.5 flex items-center gap-2">
          <PulseDot />
          <div className="leading-tight flex-1 min-w-0">
            <div className="text-[10px] font-mono text-success uppercase tracking-wider">All systems</div>
            <div className="text-[10px] text-muted-foreground truncate">{me?.email ?? "loading…"}</div>
          </div>
        </div>
        <div className="font-mono text-[9px] text-muted-foreground px-1">
          tenant <span className="text-primary/80">{me?.tenantId.slice(0, 8) ?? "…"}</span>
        </div>
        <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex relative">
      <div className="pointer-events-none fixed inset-0 cyber-grid opacity-40" />
      <div className="pointer-events-none fixed inset-0" style={{ background: "var(--gradient-glow)" }} />

      <aside className="hidden lg:flex w-64 shrink-0 border-e border-primary/15 bg-card/30 backdrop-blur-md flex-col relative z-10">
        {sidebar}
      </aside>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 start-0 z-50 w-64 bg-card border-e border-primary/20 flex flex-col lg:hidden animate-fade-in">
            {sidebar}
          </aside>
        </>
      )}

      <main className="flex-1 min-w-0 relative z-10">
        <header className="border-b border-primary/15 bg-background/60 backdrop-blur-md sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -m-2 text-muted-foreground hover:text-foreground" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">DB-Guard / Control</div>
                <h1 className="text-lg sm:text-xl font-semibold truncate">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden md:flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-2.5 py-1">
                <PulseDot /> <span className="font-mono text-[10px] text-success uppercase tracking-wider">Online</span>
              </div>
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
