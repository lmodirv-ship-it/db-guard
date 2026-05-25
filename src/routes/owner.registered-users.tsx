import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { listRegisteredUsers } from "@/lib/identity/owner-users.functions";

type User = {
  id: string;
  hn_user_code: string;
  email: string;
  full_name: string;
  phone: string | null;
  email_verified: boolean;
  source_app: string | null;
  registration_source: string | null;
  plan: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/owner/registered-users")({
  head: () => ({ meta: [{ title: "Registered users — Owner" }] }),
  component: RegisteredUsersPage,
});

function RegisteredUsersPage() {
  const listFn = useServerFn(listRegisteredUsers);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [sourceApp, setSourceApp] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const r = await listFn({ data: { search, source_app: sourceApp, status, plan, limit: 500 } });
      if (!r.ok) {
        setError(r.error === "forbidden" ? "Owner access required" : "Failed to load");
        setUsers([]);
        return;
      }
      setUsers((r as { users: User[] }).users);
      setError(null);
    } finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  function exportCsv() {
    const headers = ["hn_user_code","full_name","email","phone","source_app","plan","status","email_verified","last_login_at","created_at"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = users.map((u) => headers.map((h) => escape((u as unknown as Record<string, unknown>)[h])).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hn-registered-users-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sourceApps = useMemo(() => Array.from(new Set(users.map((u) => u.source_app).filter(Boolean))) as string[], [users]);

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Registered users</h1>
            <p className="text-sm text-muted-foreground">Central HN identity directory ({users.length} loaded)</p>
          </div>
          <button onClick={exportCsv} disabled={users.length === 0}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50">
            Export CSV
          </button>
        </header>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, code…"
            className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <select value={sourceApp} onChange={(e) => setSourceApp(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All apps</option>
            {["dbguard","chat","groupe","driver","souk", ...sourceApps.filter(a => !["dbguard","chat","groupe","driver","souk"].includes(a))].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="banned">banned</option>
          </select>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All plans</option>
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise</option>
          </select>
          <button onClick={reload} className="md:col-span-5 md:w-auto md:justify-self-end rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Apply filters</button>
        </div>

        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive mb-4">{error}</div>}

        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-start px-3 py-2">HN Code</th>
                <th className="text-start px-3 py-2">Name</th>
                <th className="text-start px-3 py-2">Email</th>
                <th className="text-start px-3 py-2">Source</th>
                <th className="text-start px-3 py-2">Plan</th>
                <th className="text-start px-3 py-2">Status</th>
                <th className="text-start px-3 py-2">Last login</th>
                <th className="text-start px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-6 text-muted-foreground text-center">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-muted-foreground text-center">No users</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{u.hn_user_code}</td>
                  <td className="px-3 py-2">{u.full_name}</td>
                  <td className="px-3 py-2">{u.email}{!u.email_verified && <span className="ml-2 text-xs text-amber-500">unverified</span>}</td>
                  <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded bg-muted">{u.source_app || "—"}</span></td>
                  <td className="px-3 py-2">{u.plan}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${u.status === "active" ? "bg-emerald-500/20 text-emerald-500" : "bg-destructive/20 text-destructive"}`}>{u.status}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
