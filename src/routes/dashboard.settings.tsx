import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — DB·GUARD" }] }),
  component: () => (
    <DashboardShell title="Settings">
      <div className="space-y-4">
        <Link to="/dashboard" className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40">
          <h3 className="font-semibold">Account</h3>
          <p className="text-sm text-muted-foreground mt-1">Change password from the legacy projects page.</p>
        </Link>
      </div>
    </DashboardShell>
  ),
});
