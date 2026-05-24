import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Users as UsersIcon, Loader2, ShieldCheck } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";

const PROTECTED_OWNER_EMAIL = "lmodirv@gmail.com";
const isProtected = (email: string) => email.trim().toLowerCase() === PROTECTED_OWNER_EMAIL;

type User = { id: string; email: string; name: string | null; role: "owner" | "admin" | "member"; created_at: string };

export const Route = createFileRoute("/owner/users")({
  head: () => ({ meta: [{ title: "Users — DB·GUARD" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "owner">("member");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
    if (me?.user?.id) setMeId(me.user.id);
    const r = await fetch("/api/admin/users");
    const j = (await r.json()) as { ok: boolean; users?: User[] };
    if (j.ok && j.users) setUsers(j.users);
    else setUsers([]);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined, role }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!j.ok) { setMsg({ kind: "err", text: j.error ?? "create_failed" }); return; }
      setMsg({ kind: "ok", text: "تمت الإضافة." });
      setEmail(""); setName(""); setPassword(""); setRole("member");
      await load();
    } finally { setBusy(false); }
  }

  async function remove(u: User) {
    if (isProtected(u.email)) {
      alert("لا يمكن حذف المالك الرئيسي للموقع.");
      return;
    }
    if (!confirm("حذف هذا المستخدم؟")) return;
    const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!j.ok && j.error === "protected_owner") {
      alert("هذا الحساب محمي ولا يمكن حذفه.");
    }
    await load();
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="إضافة وإدارة المستخدمين والصلاحيات." />

      <Panel title="إضافة مستخدم" className="mb-6">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-4">
          <input type="email" required placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <input placeholder="الاسم (اختياري)" value={name} onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <input type="password" required minLength={8} placeholder="كلمة مرور (8+)" value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}
            className="h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          <div className="sm:col-span-4 flex items-center gap-3">
            <button type="submit" disabled={busy}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة
            </button>
            {msg && <span className={msg.kind === "ok" ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</span>}
          </div>
        </form>
      </Panel>

      <Panel title="جميع المستخدمين">
        {users === null ? (
          <p className="text-sm text-muted-foreground py-6">Loading…</p>
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="لا يوجد مستخدمون" />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Email</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Created</th><th /></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const locked = isProtected(u.email) || u.id === meId;
                return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      {u.email}
                      {isProtected(u.email) && (
                        <span title="حساب المالك الرئيسي — محمي" className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-semibold">
                          <ShieldCheck className="h-3 w-3" /> Protected
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">{u.name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${
                      u.role === "owner" ? "bg-primary/20 text-primary" :
                      u.role === "admin" ? "bg-accent/20 text-accent" :
                      "bg-muted text-muted-foreground"
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => remove(u)} disabled={locked}
                      title={isProtected(u.email) ? "محمي — لا يمكن حذفه" : undefined}
                      className="text-destructive hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
