import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/records")({
  head: () => ({ meta: [{ title: "Records — DB·GUARD" }] }),
  component: () => (
    <DashboardShell title="Records">
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Open a table to view and manage its records.</p>
        <Link to="/dashboard/tables" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Browse tables →</Link>
      </div>
    </DashboardShell>
  ),
});
