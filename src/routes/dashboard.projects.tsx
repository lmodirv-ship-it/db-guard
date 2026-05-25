import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Globe, Plus, RefreshCw } from "lucide-react";

type Project = {
  id: string;
  site_url: string;
  status: string;
  verified_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/dashboard/projects")({
  head: () => ({ meta: [{ title: "Projects — DB·GUARD" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [draining, setDraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch("/api/projects");
    if (r.status === 401) {
      await navigate({ to: "/login" });
      return;
    }
    const j = (await r.json()) as { ok: boolean; projects?: Project[] };
    if (j.ok && j.projects) setProjects(j.projects);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!j.ok) {
        setError(j.error ?? "create_failed");
        return;
      }
      setUrl("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function drain() {
    setDraining(true);
    try {
      await fetch("/api/jobs/drain", { method: "POST" });
      await refresh();
    } finally {
      setDraining(false);
    }
  }

  return (
    <DashboardShell title="Connected Sites">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> Sites & Workspaces
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each verified site maps to an isolated database workspace.
          </p>
        </div>
        <button
          onClick={drain}
          disabled={draining}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50 inline-flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${draining ? "animate-spin" : ""}`} />
          {draining ? "Draining…" : "Drain queue"}
        </button>
      </div>

      <form
        onSubmit={createProject}
        className="mb-6 flex gap-2 rounded-xl border border-primary/20 bg-card p-3 shadow-[0_0_30px_-15px_var(--primary)]"
      >
        <input
          required
          placeholder="https://your-site.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-md border border-border bg-input px-3 py-2 font-mono text-sm"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> {creating ? "Adding…" : "Connect site"}
        </button>
      </form>
      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {projects === null ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No sites connected yet. Add one above to get started.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Verified</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{p.site_url}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {p.verified_at ? new Date(p.verified_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/projects/$id"
                      params={{ id: p.id }}
                      className="text-primary hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "bg-success/15 text-success border-success/30"
      : status === "failed"
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : status === "verified"
          ? "bg-primary/15 text-primary border-primary/30"
          : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-xs ${tone}`}>
      ● {status}
    </span>
  );
}
