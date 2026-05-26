import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Plus, Copy, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/dashboard/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — DB·GUARD" }] }),
  component: ApiKeys,
});

type K = { id: string; name: string; key_prefix: string; scopes: string[]; revoked_at: string | null; created_at: string; last_used_at: string | null };

function ApiKeys() {
  const [keys, setKeys] = useState<K[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch("/api/api-keys");
    const j = await r.json();
    if (j.ok) setKeys(j.keys);
  }
  useEffect(() => { refresh(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const j = await r.json();
    if (j.ok) { setNewKey(j.key); setName(""); await refresh(); }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key?")) return;
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <DashboardShell title="API Keys">
      <p className="text-sm text-muted-foreground mb-6">Generate keys to access your data via the REST API.</p>
      {newKey && (
        <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 text-yellow-500 font-medium mb-2"><AlertTriangle className="h-4 w-4" /> Save this key — it will not be shown again</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm break-all">{newKey}</code>
            <button onClick={() => navigator.clipboard.writeText(newKey)} className="rounded-md border border-border px-3 py-2"><Copy className="h-4 w-4" /></button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-muted-foreground hover:underline">Dismiss</button>
        </div>
      )}
      <form onSubmit={create} className="mb-6 flex gap-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g. Production)" className="flex-1 rounded-md border border-border bg-input px-3 py-2" />
        <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"><Plus className="h-4 w-4" /> Generate</button>
      </form>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Prefix</th><th className="px-4 py-3">Scopes</th><th className="px-4 py-3">Last used</th><th className="px-4 py-3">Status</th><th /></tr>
          </thead>
          <tbody>
            {keys.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No API keys yet.</td></tr> :
              keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{k.key_prefix}…</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{k.scopes.join(", ")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3">{k.revoked_at ? <span className="text-destructive text-xs">Revoked</span> : <span className="text-primary text-xs">Active</span>}</td>
                  <td className="px-4 py-3 text-right">
                    {!k.revoked_at && <button onClick={() => revoke(k.id)} className="text-destructive text-xs hover:underline">Revoke</button>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
