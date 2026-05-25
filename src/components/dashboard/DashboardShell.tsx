import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Database, Table2, FileText, KeyRound, Archive,
  Activity, Users, CreditCard, Settings, LogOut, Shield, Menu, X,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { to: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/databases", labelKey: "nav.databases", icon: Database },
  { to: "/dashboard/tables", labelKey: "nav.tables", icon: Table2 },
  { to: "/dashboard/records", labelKey: "nav.records", icon: FileText },
  { to: "/dashboard/api-keys", labelKey: "nav.apiKeys", icon: KeyRound },
  { to: "/dashboard/backups", labelKey: "nav.backups", icon: Archive },
  { to: "/dashboard/logs", labelKey: "nav.logs", icon: Activity },
  { to: "/dashboard/team", labelKey: "nav.team", icon: Users },
  { to: "/dashboard/billing", labelKey: "nav.billing", icon: CreditCard },
  { to: "/dashboard/settings", labelKey: "nav.settings", icon: Settings },
] as const;

export function DashboardShell({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [me, setMe] = useState<{ email?: string; tenantId: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      if (r.status === 401) {
        await navigate({ to: "/auth/login" });
        return;
      }
      const j = (await r.json()) as { ok: boolean; user?: { email: string; tenantId: string } };
      if (j.ok && j.user) setMe(j.user);
    })();
  }, [navigate]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await navigate({ to: "/auth/login" });
  }

  const sidebar = (
    <>
      <div className="px-5 py-5 border-b border-border flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-mono text-sm font-bold tracking-wider">DB·GUARD</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map((n) => {
          const active = ("exact" in n && n.exact) ? path === n.to : path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(n.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4 space-y-2">
        <div className="text-xs text-muted-foreground truncate">{me?.email ?? "…"}</div>
        <div className="font-mono text-[10px] text-muted-foreground">tenant: {me?.tenantId.slice(0, 8) ?? "…"}</div>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
          <LogOut className="h-3.5 w-3.5" /> {t("actions.signOut")}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-card/40 flex-col">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 start-0 z-50 w-64 bg-card border-e border-border flex flex-col lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <main className="flex-1 min-w-0">
        <header className="border-b border-border bg-background/60 backdrop-blur sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 -m-2 text-muted-foreground hover:text-foreground"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-lg sm:text-xl font-semibold truncate">{title}</h1>
            </div>
            <div className="flex items-center gap-1 shrink-0">
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
