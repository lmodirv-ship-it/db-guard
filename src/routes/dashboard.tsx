import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSession, logout } from "@/hooks/use-session";

type Project = {
  id: string;
  site_url: string;
  status: string;
  verified_at: string | null;
  created_at: string;
};

type QueueStats = {
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  dead_letter: number;
};

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Smart Generator" }] }),
});

function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" });
  }, [loading, user, navigate]);

  async function refresh() {
    const [pRes, jRes] = await Promise.all([
      fetch("/api/projects", { credentials: "same-origin" }),
      fetch("/api/jobs/run", { method: "POST", credentials: "same-origin" }),
    ]);
    if (pRes.ok) {
      const j = (await pRes.json()) as { projects: Project[] };
      setProjects(j.projects);
    }
    if (jRes.ok) {
      const j = (await jRes.json()) as { tenantStats: QueueStats };
      setStats(j.tenantStats);
    }
  }

  useEffect(() => {
    if (!user) return;
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [user]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ url }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "create_failed");
        return;
      }
      setUrl("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-lg font-semibold tracking-tight">
            Smart Generator
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
            <button
              onClick={async () => {
                await logout();
                void navigate({ to: "/login" });
              }}
              className="rounded-md border border-input px-3 py-1.5 hover:bg-accent"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Queued" value={stats.queued} />
            <Stat label="Running" value={stats.running} />
            <Stat label="Succeeded" value={stats.succeeded} tone="ok" />
            <Stat label="Failed" value={stats.failed} tone="warn" />
            <Stat label="Dead letter" value={stats.dead_letter} tone="bad" />
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-base font-semibold">New project from URL</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a website URL. We'll generate a verification token, then run
            verification → analysis → schema → import.
          </p>
          <form onSubmit={createProject} className="mt-4 flex gap-2">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
            />
            <button
              disabled={creating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Projects</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">URL</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Verified</th>
                    <th className="px-4 py-2 font-medium">Created</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs">{p.site_url}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.verified_at ? "✓" : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/projects/$id"
                          params={{ id: p.id }}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "bad";
}) {
  const colors =
    tone === "ok"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "bad"
      ? "text-destructive"
      : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${colors}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    verifying: "bg-amber-500/10 text-amber-700",
    verified: "bg-emerald-500/10 text-emerald-700",
    analyzing: "bg-blue-500/10 text-blue-700",
    generating_schema: "bg-blue-500/10 text-blue-700",
    importing: "bg-blue-500/10 text-blue-700",
    completed: "bg-emerald-500/15 text-emerald-700",
    failed: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
        map[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}
