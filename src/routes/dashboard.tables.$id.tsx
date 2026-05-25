import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/tables/$id")({
  head: () => ({ meta: [{ title: "Table — DB·GUARD" }] }),
  component: TableDetail,
});

type Col = { id: string; name: string; data_type: string; is_required: boolean; position: number };
type Rec = { id: string; data: Record<string, unknown>; created_at: string };

function TableDetail() {
  const { id } = Route.useParams();
  const [meta, setMeta] = useState<{ table: { name: string; description: string | null; is_system: boolean }; columns: Col[] } | null>(null);
  const [records, setRecords] = useState<Rec[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  async function loadMeta() {
    const r = await fetch(`/api/tables/${id}`);
    const j = await r.json();
    if (j.ok) setMeta(j);
  }
  async function loadRecords() {
    const r = await fetch(`/api/tables/${id}/records${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const j = await r.json();
    if (j.ok) setRecords(j.records);
  }
  useEffect(() => { loadMeta(); }, [id]);
  useEffect(() => { loadRecords(); }, [id, q]);

  async function createRecord(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    for (const c of meta!.columns) {
      const v = values[c.name];
      if (v === undefined || v === "") continue;
      if (c.data_type === "number") data[c.name] = Number(v);
      else if (c.data_type === "boolean") data[c.name] = v === "true";
      else data[c.name] = v;
    }
    const r = await fetch(`/api/tables/${id}/records`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    const j = await r.json();
    if (j.ok) { setValues({}); setShowNew(false); await loadRecords(); }
  }

  async function del(rid: string) {
    if (!confirm("Delete record?")) return;
    await fetch(`/api/records/${rid}`, { method: "DELETE" });
    await loadRecords();
  }

  if (!meta) return <DashboardShell title="Loading…"><p>Loading…</p></DashboardShell>;

  return (
    <DashboardShell title={meta.table.name}>
      <div className="flex items-center justify-between mb-4">
        <Link to="/dashboard/tables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All tables
        </Link>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="rounded-md border border-border bg-input px-3 py-1.5 text-sm" />
          <button onClick={() => setShowNew((s) => !s)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"><Plus className="h-4 w-4" /> New</button>
        </div>
      </div>

      {showNew && (
        <form onSubmit={createRecord} className="mb-4 rounded-xl border border-border bg-card p-4 grid gap-3 sm:grid-cols-2">
          {meta.columns.map((c) => (
            <label key={c.id} className="text-xs">
              <span className="block text-muted-foreground mb-1 font-mono">{c.name} <span className="text-[10px]">({c.data_type})</span></span>
              <input value={values[c.name] ?? ""} onChange={(e) => setValues({ ...values, [c.name]: e.target.value })} required={c.is_required} className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm" />
            </label>
          ))}
          <button type="submit" className="col-span-full justify-self-start rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Save</button>
        </form>
      )}

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              {meta.columns.map((c) => <th key={c.id} className="px-4 py-3 font-mono text-xs">{c.name}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={meta.columns.length + 1} className="p-6 text-center text-muted-foreground text-sm">No records yet.</td></tr>
            ) : records.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                {meta.columns.map((c) => (
                  <td key={c.id} className="px-4 py-2 font-mono text-xs">
                    {String((r.data as Record<string, unknown>)[c.name] ?? "—")}
                  </td>
                ))}
                <td className="px-4 py-2 text-right">
                  <button onClick={() => del(r.id)} className="text-destructive hover:underline"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
