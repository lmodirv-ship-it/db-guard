import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

type Project = {
  id: string;
  site_url: string;
  status: string;
  verification_method: string | null;
  verification_token: string;
  verified_at: string | null;
  schema_json: unknown;
  stats_json: unknown;
  error_message: string | null;
};

export const Route = createFileRoute("/projects/$id")({
  head: () => ({ meta: [{ title: "Project — db-guard" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch(`/api/projects/${id}`);
    if (r.status === 401) {
      await navigate({ to: "/login" });
      return;
    }
    const j = (await r.json()) as { ok: boolean; project?: Project };
    if (j.ok && j.project) setProject(j.project);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function action(label: string, fn: () => Promise<Response>) {
    setBusy(label);
    setError(null);
    try {
      const r = await fn();
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!j.ok) setError(j.error ?? "failed");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!project)
    return <div className="p-10 text-sm text-muted-foreground">Loading project…</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="font-mono text-sm">
            ▣ db-guard / projects
          </Link>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-mono text-lg">{project.site_url}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status:{" "}
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{project.status}</span>
          {project.verification_method && (
            <> · verified via <code>{project.verification_method}</code></>
          )}
        </p>
        {project.error_message && (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {project.error_message}
          </p>
        )}

        <section className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold">1. Verify ownership</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use any of the three methods below, then click Verify.
          </p>
          <ul className="mt-4 space-y-2 font-mono text-xs">
            <li>
              <strong>well-known:</strong> upload file containing token at{" "}
              <code>/.well-known/hn-verify-{project.verification_token}.txt</code>
            </li>
            <li>
              <strong>DNS TXT:</strong> add TXT on{" "}
              <code>_hn-verify.&lt;your-domain&gt;</code> with the token
            </li>
            <li>
              <strong>meta tag:</strong>{" "}
              <code>{`<meta name="hn-verify" content="${project.verification_token}">`}</code>
            </li>
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              disabled={busy !== null}
              onClick={() =>
                action("verify", () => fetch(`/api/projects/${id}/verify`, { method: "POST" }))
              }
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy === "verify" ? "Verifying…" : "Verify now"}
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold">2. Analyze + generate schema</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Available after verification. Stores artifacts in R2.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={busy !== null || !project.verified_at}
              onClick={() =>
                action("analyze", () => fetch(`/api/projects/${id}/analyze`, { method: "POST" }))
              }
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {busy === "analyze" ? "Analyzing…" : "Analyze synchronously"}
            </button>
            <button
              disabled={busy !== null || !project.verified_at}
              onClick={() =>
                action("queue", () =>
                  fetch(`/api/jobs/enqueue`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: id, kind: "analyze" }),
                  }),
                )
              }
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {busy === "queue" ? "Queued…" : "Queue background job"}
            </button>
          </div>
        </section>

        {project.stats_json !== null && (
          <details className="mt-6 rounded-lg border border-border bg-card p-5">
            <summary className="cursor-pointer font-semibold">Analysis</summary>
            <pre className="mt-3 overflow-auto rounded bg-muted p-3 font-mono text-xs">
              {JSON.stringify(project.stats_json, null, 2)}
            </pre>
          </details>
        )}

        {project.schema_json !== null && (
          <details className="mt-4 rounded-lg border border-border bg-card p-5">
            <summary className="cursor-pointer font-semibold">Generated schema</summary>
            <pre className="mt-3 overflow-auto rounded bg-muted p-3 font-mono text-xs">
              {JSON.stringify(project.schema_json, null, 2)}
            </pre>
          </details>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
