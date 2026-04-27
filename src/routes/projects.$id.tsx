import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";

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

type FileRow = {
  id: string;
  r2_key: string;
  kind: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

export const Route = createFileRoute("/projects/$id")({
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" });
  }, [loading, user, navigate]);

  async function refresh() {
    const [pRes, fRes] = await Promise.all([
      fetch(`/api/projects/${id}`, { credentials: "same-origin" }),
      fetch(`/api/projects/${id}/files`, { credentials: "same-origin" }),
    ]);
    if (pRes.ok) {
      const j = (await pRes.json()) as { project: Project };
      setProject(j.project);
    }
    if (fRes.ok) {
      const j = (await fRes.json()) as { files: FileRow[] };
      setFiles(j.files);
    }
  }

  useEffect(() => {
    if (!user) return;
    void refresh();
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
  }, [user, id]);

  async function enqueue(kind: string) {
    setErr(null);
    setBusy(kind);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ projectId: id, kind }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? "enqueue_failed");
        return;
      }
      // Trigger a worker tick immediately
      await fetch("/api/jobs/run", { method: "POST", credentials: "same-origin" });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy("upload");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("kind", "user_upload");
      const res = await fetch(`/api/projects/${id}/files`, {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? "upload_failed");
      }
      await refresh();
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  }

  if (loading || !user) return null;
  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading project…
      </div>
    );
  }

  const verified = !!project.verified_at;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section>
          <h1 className="text-2xl font-semibold">{project.site_url}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status: <span className="font-medium text-foreground">{project.status}</span>
            {project.verification_method && (
              <span className="ml-2">via {project.verification_method}</span>
            )}
          </p>
          {project.error_message && (
            <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {project.error_message}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-base font-semibold">Verification</h2>
          {!verified ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Prove you own this site using <em>any one</em> of these:
              </p>
              <ul className="mt-3 space-y-3 text-sm">
                <li>
                  <strong>Well-known file:</strong>
                  <code className="ml-1 break-all rounded bg-muted px-1.5 py-0.5 text-xs">
                    /.well-known/hn-verify-{project.verification_token}.txt
                  </code>{" "}
                  containing the token.
                </li>
                <li>
                  <strong>DNS TXT:</strong>{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    _hn-verify.&lt;your-host&gt;
                  </code>{" "}
                  with value{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {project.verification_token}
                  </code>
                </li>
                <li>
                  <strong>Meta tag:</strong>{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {`<meta name="hn-verify" content="${project.verification_token}">`}
                  </code>
                </li>
              </ul>
              <button
                onClick={() => enqueue("verify")}
                disabled={busy === "verify"}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {busy === "verify" ? "Queuing…" : "Run verification"}
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-emerald-700">
              ✓ Verified at {new Date(project.verified_at!).toLocaleString()}
            </p>
          )}
        </section>

        {verified && (
          <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Pipeline</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => enqueue("analyze")}
                  disabled={!!busy}
                  className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                >
                  Re-analyze
                </button>
                <button
                  onClick={() => enqueue("full_pipeline")}
                  disabled={!!busy}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Run full pipeline
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Pre title="Analysis" data={project.stats_json} />
              <Pre title="Generated schema" data={project.schema_json} />
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Files</h2>
            <label className="cursor-pointer rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
              {busy === "upload" ? "Uploading…" : "Upload"}
              <input
                type="file"
                onChange={uploadFile}
                className="hidden"
                disabled={busy === "upload"}
              />
            </label>
          </div>
          {files.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No files yet.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Name</th>
                  <th className="py-1 font-medium">Kind</th>
                  <th className="py-1 font-medium">Size</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{f.r2_key.split("/").pop()}</td>
                    <td className="py-2">{f.kind}</td>
                    <td className="py-2 text-muted-foreground">{formatBytes(f.size_bytes)}</td>
                    <td className="py-2 text-right">
                      <a
                        href={`/api/files/${f.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {err && <p className="text-sm text-destructive">{err}</p>}
      </main>
    </div>
  );
}

function Pre({ title, data }: { title: string; data: unknown }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
        {data ? JSON.stringify(data, null, 2) : "—"}
      </pre>
    </div>
  );
}

function formatBytes(n: number | null): string {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
