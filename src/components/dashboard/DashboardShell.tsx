import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Database, Table2, FileText, KeyRound, Archive,
  Activity, Users, CreditCard, Settings, LogOut, Shield, BookOpen, Cloud, TestTube2, Globe, Cpu,
} from "lucide-react";

const NAV: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/runtime", label: "Runtime", icon: Cpu },
  { to: "/dashboard/hn-data", label: "HN Data Platform", icon: Cloud },
  { to: "/dashboard/sites-discover", label: "Add Site by URL", icon: Globe },
  { to: "/dashboard/sdk-test", label: "SDK Test", icon: TestTube2 },
  { to: "/dashboard/databases", label: "Databases", icon: Database },
  { to: "/dashboard/tables", label: "Tables", icon: Table2 },
  { to: "/dashboard/records", label: "Records", icon: FileText },
  { to: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/dashboard/docs", label: "API Docs", icon: BookOpen },
  { to: "/dashboard/backups", label: "Backups", icon: Archive },
  { to: "/dashboard/logs", label: "Logs", icon: Activity },
  { to: "/dashboard/team", label: "Team", icon: Users },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [me, setMe] = useState<{ email?: string; tenantId: string } | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      if (r.status === 401) {
        await navigate({ to: "/login" });
        return;
      }
      const j = (await r.json()) as { ok: boolean; user?: { email: string; tenantId: string } };
      if (j.ok && j.user) setMe(j.user);
    })();
  }, [navigate]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 shrink-0 border-r border-border bg-card/40 flex flex-col">
        <div className="px-5 py-5 border-b border-border flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-bold tracking-wider">DB·GUARD</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4 space-y-2">
          <div className="text-xs text-muted-foreground truncate">{me?.email ?? "…"}</div>
          <div className="font-mono text-[10px] text-muted-foreground">tenant: {me?.tenantId.slice(0, 8) ?? "…"}</div>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="border-b border-border bg-background/60 backdrop-blur sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
