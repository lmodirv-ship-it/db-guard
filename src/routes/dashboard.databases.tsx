import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Database } from "lucide-react";

export const Route = createFileRoute("/dashboard/databases")({
  head: () => ({ meta: [{ title: "Databases — DB·GUARD" }] }),
  component: () => (
    <DashboardShell title="Databases">
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Database className="h-10 w-10 mx-auto text-primary mb-3" />
        <h3 className="font-semibold">Default Workspace</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">All your tables live in your default workspace.</p>
        <Link to="/dashboard/tables" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">View tables →</Link>
      </div>
    </DashboardShell>
  ),
});
