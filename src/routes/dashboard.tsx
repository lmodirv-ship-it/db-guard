import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

type Project = {
  id: string;
  site_url: string;
  status: string;
  verified_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — db-guard" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState<{ email?: string; tenantId: string } | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [draining, setDraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!j.ok) {
        setPwdMsg({ kind: "err", text: j.error ?? "change_failed" });
        return;
      }
      setPwdMsg({ kind: "ok", text: "Password changed successfully." });
      setCurPwd("");
      setNewPwd("");
    } finally {
      setPwdSaving(false);
    }
  }

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
    (async () => {
      const r = await fetch("/api/auth/me");
      if (r.status === 401) {
        await navigate({ to: "/login" });
        return;
      }
      const j = (await r.json()) as { ok: boolean; user?: { email: string; tenantId: string } };
      if (j.ok && j.user) setMe(j.user);
      await refresh();
    })();
  }, [navigate]);

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
      const j = (await r.json()) as { ok: boolean; error?: string; project?: { id: string } };
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await navigate({ to: "/login" });
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-sm font-semibold">
            ▣ db-guard
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-mono text-xs text-muted-foreground">
              tenant: {me?.tenantId.slice(0, 8) ?? "…"}
            </span>
            <span className="text-muted-foreground">{me?.email}</span>
            <button
              onClick={() => setShowPwd((s) => !s)}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
            >
              {showPwd ? "Close" : "Change password"}
            </button>
            <button onClick={logout} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {showPwd && (
          <form
            onSubmit={changePassword}
            className="mb-6 rounded-lg border border-border bg-card p-4"
          >
            <h2 className="mb-3 text-sm font-semibold">Change password</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="password"
                required
                placeholder="Current password"
                autoComplete="current-password"
                value={curPwd}
                onChange={(e) => setCurPwd(e.target.value)}
                className="rounded-md border border-border bg-input px-3 py-2"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="New password (min 8 chars)"
                autoComplete="new-password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="rounded-md border border-border bg-input px-3 py-2"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={pwdSaving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {pwdSaving ? "Saving…" : "Update password"}
              </button>
              {pwdMsg && (
                <span
                  className={
                    pwdMsg.kind === "ok"
                      ? "text-sm text-primary"
                      : "text-sm text-destructive"
                  }
                >
                  {pwdMsg.text}
                </span>
              )}
            </div>
          </form>
        )}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a URL, verify ownership, and we&apos;ll import the data.
            </p>
          </div>
          <button
            onClick={drain}
            disabled={draining}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            title="Process up to 10 queued jobs in parallel"
          >
            {draining ? "Draining…" : "Drain jobs (10 ⇉)"}
          </button>
        </div>

        <form
          onSubmit={createProject}
          className="mt-6 flex gap-2 rounded-lg border border-border bg-card p-3"
        >
          <input
            required
            placeholder="https://your-site.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-md border border-border bg-input px-3 py-2"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Adding…" : "Add project"}
          </button>
        </form>
        {error && (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card">
          {projects === null ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No projects yet. Add one above to get started.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Verified</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{p.site_url}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.verified_at ? new Date(p.verified_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
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
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "bg-accent text-accent-foreground"
      : status === "failed"
        ? "bg-destructive/15 text-destructive"
        : status === "verified"
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-xs ${tone}`}>
      {status}
    </span>
  );
}
