import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderKanban, Database, Activity, Files,
  Users, ShieldCheck, KeyRound,
  ScrollText, BellRing, HeartPulse,
  Plug, Settings as SettingsIcon,
  Search, Bell, HelpCircle, Sun, ChevronDown, Sparkles, Building2,
} from "lucide-react";
import { Logo } from "@/components/Logo";

type Me = { id: string; email: string; tenantId: string };

export const Route = createFileRoute("/owner")({
  head: () => ({ meta: [{ title: "Owner Console — DB·GUARD" }] }),
  component: OwnerLayout,
});

type NavItem = { label: string; icon: React.ComponentType<{ className?: string }>; to: string };
type NavSection = { title?: string; items: NavItem[] };

const NAV: NavSection[] = [
  { items: [{ label: "Overview", icon: LayoutDashboard, to: "/owner" }] },
  { title: "Data Management", items: [
    { label: "Projects", icon: FolderKanban, to: "/owner/projects" },
    { label: "Records",  icon: Database,     to: "/owner/records" },
    { label: "Jobs",     icon: Activity,     to: "/owner/jobs" },
    { label: "Files",    icon: Files,        to: "/owner/files" },
  ]},
  { title: "Access & Security", items: [
    { label: "Tenants",  icon: Building2,    to: "/owner/tenants" },
    { label: "Users",    icon: Users,        to: "/owner/users" },
    { label: "Registered Users", icon: Users, to: "/owner/registered-users" },
    { label: "ID Users", icon: Users, to: "/owner/id-users" },
    { label: "Roles",    icon: ShieldCheck,  to: "/owner/roles" },
    { label: "API Keys", icon: KeyRound,     to: "/owner/api-keys" },
  ]},
  { title: "Monitoring", items: [
    { label: "Audit Logs",    icon: ScrollText, to: "/owner/audit-logs" },
    { label: "Alerts",        icon: BellRing,   to: "/owner/alerts" },
    { label: "System Health", icon: HeartPulse, to: "/owner/health" },
  ]},
  { title: "Settings", items: [
    { label: "Integrations", icon: Plug,         to: "/owner/integrations" },
    { label: "Settings",     icon: SettingsIcon, to: "/owner/settings" },
  ]},
];

function OwnerLayout() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      if (r.status === 401) { await navigate({ to: "/login" }); return; }
      const j = (await r.json()) as { ok: boolean; user?: Me };
      if (j.ok && j.user) setMe(j.user);
      const probe = await fetch("/api/admin/db-status");
      if (probe.status === 403) setForbidden(true);
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

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 cyber-grid opacity-30" />
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[160px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-accent/20 blur-[160px]" />
      </div>

      <Sidebar email={me?.email} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar email={me?.email} onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          await navigate({ to: "/login" });
        }} />
        <main className="flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar({ email }: { email?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card/40 backdrop-blur-xl flex flex-col sticky top-0 h-screen">
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
                const active = it.to === "/owner" ? pathname === "/owner" : pathname.startsWith(it.to);
                const cls = active
                  ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40";
                return (
                  <li key={it.label}>
                    <Link to={it.to} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${cls}`}>
                      <Icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
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

function TopBar({ email, onLogout }: { email?: string; onLogout: () => void }) {
  return (
    <header className="h-16 border-b border-border bg-card/30 backdrop-blur-xl px-8 flex items-center gap-4 sticky top-0 z-10">
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
          <span className="font-mono text-xs">{email ? email.split("@")[1]?.toUpperCase() ?? "Tenant" : "Tenant"}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={onLogout} className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-sm font-bold text-primary-foreground" title="Logout">
          {(email?.[0] ?? "O").toUpperCase()}
        </button>
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
