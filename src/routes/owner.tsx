import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

type Me = { id: string; email: string; tenantId: string };
type DbStatus = {
  ping: { ok: boolean; latencyMs: number; error?: string };
  migrations: Array<{ name: string; applied_at: string }>;
  counts: { tenants: number; users: number; projects: number; jobs: number; records: number };
};
type User = {
  id: string;
  email: string;
  name: string | null;
  role: "owner" | "admin" | "member";
  created_at: string;
};

type AuditLog = {
  id: string;
  ts: string;
  action: string;
  target: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  ip: string | null;
  user_agent: string | null;
  meta: Record<string, unknown> | null;
};

export const Route = createFileRoute("/owner")({
  head: () => ({ meta: [{ title: "Owner Console — db-guard" }] }),
  component: OwnerConsole,
});

function OwnerConsole() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<"db" | "users" | "password" | "audit">("db");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me");
      if (r.status === 401) {
        await navigate({ to: "/login" });
        return;
      }
      const j = (await r.json()) as { ok: boolean; user?: Me };
      if (j.ok && j.user) setMe(j.user);
      // probe owner access
      const probe = await fetch("/api/admin/db-status");
      if (probe.status === 403) setForbidden(true);
    })();
  }, [navigate]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await navigate({ to: "/login" });
  }

  if (forbidden) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
          <h1 className="text-lg font-semibold text-destructive">403 — Owner only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            هذه اللوحة متاحة فقط لمالك الموقع.
          </p>
          <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">
            ← العودة إلى لوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-mono text-sm font-semibold">▣ db-guard</Link>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-xs text-primary">
              owner
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{me?.email}</span>
            <Link to="/dashboard" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
              Dashboard
            </Link>
            <button onClick={logout} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold">Owner Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إعداد قاعدة البيانات، إدارة المستخدمين، وتغيير كلمة المرور.
        </p>

        <nav className="mt-6 flex gap-2 border-b border-border">
          <TabBtn active={tab === "db"} onClick={() => setTab("db")}>قاعدة البيانات</TabBtn>
          <TabBtn active={tab === "users"} onClick={() => setTab("users")}>المستخدمون</TabBtn>
          <TabBtn active={tab === "password"} onClick={() => setTab("password")}>كلمة المرور</TabBtn>
          <TabBtn active={tab === "audit"} onClick={() => setTab("audit")}>سجل التدقيق</TabBtn>
        </nav>

        <section className="mt-8">
          {tab === "db" && <DbPanel />}
          {tab === "users" && <UsersPanel currentUserId={me?.id ?? null} />}
          {tab === "password" && <PasswordPanel />}
          {tab === "audit" && <AuditPanel />}
        </section>
      </main>
    </div>
  );
}

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function DbPanel() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/db-status");
      const j = (await r.json()) as { ok: boolean } & DbStatus;
      if (j.ok) setStatus(j);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">حالة قاعدة البيانات</h2>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {!status ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Connection"
              value={status.ping.ok ? "Online" : "Offline"}
              tone={status.ping.ok ? "ok" : "err"}
              hint={`${status.ping.latencyMs}ms${status.ping.error ? ` · ${status.ping.error}` : ""}`}
            />
            <Stat label="Tenants"  value={String(status.counts.tenants)} />
            <Stat label="Users"    value={String(status.counts.users)} />
            <Stat label="Projects" value={String(status.counts.projects)} />
            <Stat label="Jobs"     value={String(status.counts.jobs)} />
            <Stat label="Records"  value={String(status.counts.records)} />
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-sm font-medium">
              Migrations applied
            </div>
            {status.migrations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                لا توجد ترحيلات مسجَّلة. شغّل: <code className="font-mono">bun run scripts/migrate.ts</code>
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {status.migrations.map((m) => (
                  <li key={m.name} className="flex items-center justify-between px-4 py-2">
                    <span className="font-mono">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.applied_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <h3 className="mb-2 font-semibold">إعداد قاعدة البيانات</h3>
            <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
              <li>تأكد من أن المتغيرات <code className="font-mono">HN_DB_URL</code> و <code className="font-mono">HN_DB_DIRECT_URL</code> مضبوطة.</li>
              <li>شغّل الترحيلات: <code className="font-mono">bun run scripts/migrate.ts</code></li>
              <li>تحقّق من ظهور 0001/0002/0003 في القائمة أعلاه.</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label, value, hint, tone,
}: { label: string; value: string; hint?: string; tone?: "ok" | "err" }) {
  const ring =
    tone === "ok" ? "ring-1 ring-primary/30"
    : tone === "err" ? "ring-1 ring-destructive/40"
    : "";
  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${ring}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 font-mono text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function UsersPanel({ currentUserId }: { currentUserId: string | null }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "owner">("member");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const r = await fetch("/api/admin/users");
    const j = (await r.json()) as { ok: boolean; users?: User[] };
    if (j.ok && j.users) setUsers(j.users);
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

  async function remove(id: string) {
    if (!confirm("حذف هذا المستخدم؟")) return;
    const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const j = (await r.json()) as { ok: boolean; error?: string };
    if (!j.ok) { setMsg({ kind: "err", text: j.error ?? "delete_failed" }); return; }
    await load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">إضافة مستخدم</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            type="email" required placeholder="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2"
          />
          <input
            placeholder="name (اختياري)" value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2"
          />
          <input
            type="password" required minLength={8} placeholder="password (8+)"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2"
          />
          <select
            value={role} onChange={(e) => setRole(e.target.value as typeof role)}
            className="rounded-md border border-border bg-input px-3 py-2"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit" disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "إضافة"}
          </button>
          {msg && (
            <span className={msg.kind === "ok" ? "text-sm text-primary" : "text-sm text-destructive"}>
              {msg.text}
            </span>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {users === null ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">لا يوجد مستخدمون.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">{u.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(u.id)}
                      disabled={u.id === currentUserId}
                      className="text-destructive hover:underline disabled:opacity-30 disabled:no-underline"
                      title={u.id === currentUserId ? "لا يمكن حذف حسابك الحالي" : "حذف"}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PasswordPanel() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!j.ok) { setMsg({ kind: "err", text: j.error ?? "change_failed" }); return; }
      setMsg({ kind: "ok", text: "تم تغيير كلمة المرور بنجاح." });
      setCur(""); setNext("");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="max-w-lg rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">تغيير كلمة المرور</h2>
      <div className="grid gap-3">
        <input
          type="password" required autoComplete="current-password"
          placeholder="كلمة المرور الحالية"
          value={cur} onChange={(e) => setCur(e.target.value)}
          className="rounded-md border border-border bg-input px-3 py-2"
        />
        <input
          type="password" required minLength={8} autoComplete="new-password"
          placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)"
          value={next} onChange={(e) => setNext(e.target.value)}
          className="rounded-md border border-border bg-input px-3 py-2"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit" disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "تحديث"}
        </button>
        {msg && (
          <span className={msg.kind === "ok" ? "text-sm text-primary" : "text-sm text-destructive"}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
