import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban, Plus, ExternalLink, ShieldCheck, Loader2 } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";

type Project = {
  id: string;
  site_url: string;
  status: string;
  verified_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/owner/projects")({
  head: () => ({ meta: [{ title: "Projects — DB·GUARD" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const r = await fetch("/api/projects");
    const j = (await r.json()) as { ok: boolean; projects?: Project[] };
    if (j.ok && j.projects) setProjects(j.projects);
    else setProjects([]);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!j.ok) { setMsg({ kind: "err", text: j.error ?? "create_failed" }); return; }
      setMsg({ kind: "ok", text: "تمت إضافة المشروع." });
      setUrl("");
      await load();
    } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Projects" subtitle="إدارة المواقع والمشاريع المسجَّلة في حسابك." />

      <Panel title="إضافة مشروع جديد" className="mb-6">
        <form onSubmit={create} className="flex flex-wrap items-center gap-3">
          <input
            type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 min-w-[280px] h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button type="submit" disabled={busy}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة
          </button>
          {msg && <span className={msg.kind === "ok" ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</span>}
        </form>
      </Panel>

      <Panel title="جميع المشاريع">
        {projects === null ? (
          <p className="text-sm text-muted-foreground py-6">Loading…</p>
        ) : projects.length === 0 ? (
          <EmptyState icon={FolderKanban} title="لا توجد مشاريع بعد" description="أضف أول مشروع للبدء." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">URL</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th /></tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-3 font-mono text-xs flex items-center gap-2">
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />{p.site_url}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${
                      p.verified_at ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {p.verified_at ? <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />verified</span> : p.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right">
                    <a href={`/projects/${p.id}`} className="text-primary hover:underline text-xs">فتح</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
