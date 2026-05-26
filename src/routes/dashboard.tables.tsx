import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Plus, Lock } from "lucide-react";

export const Route = createFileRoute("/dashboard/tables")({
  head: () => ({ meta: [{ title: "Tables — DB·GUARD" }] }),
  component: TablesPage,
});

type T = { id: string; name: string; description: string | null; is_system: boolean; column_count: number; record_count: number; created_at: string };

function TablesPage() {
  const [tables, setTables] = useState<T[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch("/api/tables");
    const j = (await r.json()) as { ok: boolean; tables?: T[] };
    if (j.ok && j.tables) setTables(j.tables);
  }
  useEffect(() => { refresh(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setErr(null);
    const r = await fetch("/api/tables", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = await r.json();
    setCreating(false);
    if (!j.ok) { setErr(j.error); return; }
    setName(""); setShowNew(false); await refresh();
  }

  return (
    <DashboardShell title="Tables">
      <div className="flex justify-between mb-6">
        <p className="text-sm text-muted-foreground">Define and manage your database tables.</p>
        <button onClick={() => setShowNew((s) => !s)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> New Table
        </button>
      </div>
      {showNew && (
        <form onSubmit={create} className="mb-6 rounded-xl border border-border bg-card p-4 flex gap-2">
          <input required value={name} onChange={(e) => setName(e.target.value)} pattern="[a-zA-Z][a-zA-Z0-9_]*" placeholder="table_name" className="flex-1 rounded-md border border-border bg-input px-3 py-2 font-mono text-sm" />
          <button type="submit" disabled={creating} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{creating ? "Creating…" : "Create"}</button>
          {err && <span className="text-sm text-destructive self-center">{err}</span>}
        </form>
      )}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {tables === null ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : tables.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No tables yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Columns</th><th className="px-4 py-3">Records</th><th className="px-4 py-3">Created</th><th /></tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono">
                    {t.is_system && <Lock className="inline h-3 w-3 mr-1.5 text-muted-foreground" />}
                    {t.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.column_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.record_count}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/dashboard/tables/$id" params={{ id: t.id }} className="text-primary hover:underline">Open →</Link>
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
