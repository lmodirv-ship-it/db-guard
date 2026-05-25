import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Archive, Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard/backups")({
  head: () => ({ meta: [{ title: "Backups — DB·GUARD" }] }),
  component: Backups,
});

type B = { id: string; label: string; size_bytes: number; created_at: string };

function Backups() {
  const [backups, setBackups] = useState<B[]>([]);
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch("/api/backups");
    const j = await r.json();
    if (j.ok) setBackups(j.backups);
  }
  useEffect(() => { refresh(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const r = await fetch("/api/backups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
    const j = await r.json();
    if (!j.ok) { setErr(j.error); return; }
    setLabel(""); await refresh();
  }

  return (
    <DashboardShell title="Backups">
      <p className="text-sm text-muted-foreground mb-6">Logical snapshots of all your records. Available on Starter plan and above.</p>
      <form onSubmit={create} className="mb-6 flex gap-2">
        <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Backup label" className="flex-1 rounded-md border border-border bg-input px-3 py-2" />
        <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"><Plus className="h-4 w-4" /> Create snapshot</button>
      </form>
      {err === "plan_no_backups" && <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">Backups require a paid plan. <a href="/dashboard/billing" className="underline">Upgrade</a>.</p>}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {backups.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No backups yet.</p> : (
          <ul className="divide-y divide-border">
            {backups.map((b) => (
              <li key={b.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Archive className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">{b.label}</div>
                    <div className="text-xs text-muted-foreground">{(b.size_bytes / 1024).toFixed(1)} KB · {new Date(b.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
