import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Plus, Trash2, ShieldCheck, Database, Copy, CheckCircle2 } from "lucide-react";
import {
  getCurrentSimpleUser,
  logoutSimpleUser,
  listMyIdRecords,
  createMyIdRecord,
  deleteMyIdRecord,
} from "@/lib/id-auth/auth.functions";

export const Route = createFileRoute("/quick-dashboard")({
  head: () => ({ meta: [{ title: "لوحتي — HN ID" }, { name: "robots", content: "noindex" }] }),
  component: QuickDashboardPage,
});

function QuickDashboardPage() {
  const navigate = useNavigate();
  const meFn = useServerFn(getCurrentSimpleUser);
  const logoutFn = useServerFn(logoutSimpleUser);

  const { data, isLoading } = useQuery({
    queryKey: ["id-me"],
    queryFn: () => meFn(),
  });

  useEffect(() => {
    if (!isLoading && data && !data.ok) {
      navigate({ to: "/quick" });
    }
  }, [isLoading, data, navigate]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.07_0.02_270)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data.ok || !data.user) return null;
  const user = data.user;

  return (
    <div className="min-h-screen text-foreground" style={{ background: "oklch(0.07 0.02 270)" }} dir="rtl">
      <header className="border-b border-border/40 bg-card/30 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl font-brand text-sm font-black"
              style={{
                background: "linear-gradient(135deg, oklch(0.88 0.18 85), oklch(0.68 0.2 55))",
                color: "oklch(0.13 0.02 270)",
                boxShadow: "0 0 24px oklch(0.85 0.18 85 / 0.45)",
              }}
            >
              HN
            </div>
            <div>
              <h1 className="text-lg font-bold">لوحتي الخاصة</h1>
              <p className="text-xs text-muted-foreground">{user.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <code
              className="hidden rounded-lg border px-2.5 py-1 font-mono text-xs sm:inline-flex"
              style={{ borderColor: "oklch(0.85 0.18 85 / 0.35)", color: "oklch(0.92 0.18 90)" }}
            >
              {user.login_id}
            </code>
            <button
              onClick={async () => {
                await logoutFn();
                navigate({ to: "/quick" });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-sm hover:bg-card/70"
            >
              <LogOut className="h-4 w-4" /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <ProfileCard
          login_id={user.login_id}
          full_name={user.full_name}
          email={user.email}
          phone={user.phone}
        />
        <RecordsPanel />
      </main>
    </div>
  );
}

function ProfileCard({
  login_id,
  full_name,
  email,
  phone,
}: {
  login_id: string;
  full_name: string;
  email: string;
  phone: string | null;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <section
      className="rounded-2xl border p-6"
      style={{
        borderColor: "oklch(0.85 0.18 85 / 0.25)",
        background: "linear-gradient(135deg, oklch(0.13 0.04 270 / 0.7), oklch(0.09 0.02 270 / 0.85))",
      }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: "oklch(0.85 0.18 85)" }}>
        <ShieldCheck className="h-4 w-4" />
        البيانات الشخصية
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="الاسم" value={full_name} />
        <Info label="الإيميل" value={email} />
        <Info label="الهاتف" value={phone || "—"} />
        <div>
          <div className="text-[11px] text-muted-foreground">رقم الدخول</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="font-brand text-lg font-black" style={{ color: "oklch(0.92 0.18 90)" }}>
              {login_id}
            </code>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(login_id);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-card/40 px-2 py-0.5 text-xs hover:bg-card/70"
            >
              {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "تم" : "نسخ"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function RecordsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyIdRecords);
  const createFn = useServerFn(createMyIdRecord);
  const deleteFn = useServerFn(deleteMyIdRecord);

  const { data, isLoading } = useQuery({
    queryKey: ["id-records"],
    queryFn: () => listFn(),
  });

  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (t: string) => createFn({ data: { title: t, data: {} } }),
    onSuccess: () => {
      setTitle("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["id-records"] });
    },
    onError: () => setError("تعذر إنشاء السجل"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["id-records"] }),
  });

  const records = data && data.ok ? data.records : [];

  return (
    <section
      className="rounded-2xl border p-6"
      style={{
        borderColor: "oklch(0.85 0.18 85 / 0.18)",
        background: "oklch(0.1 0.02 270 / 0.6)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4" style={{ color: "oklch(0.85 0.18 85)" }} />
          قاعدة بياناتي
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) create.mutate(title.trim());
        }}
        className="mb-4 flex flex-wrap gap-2"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          placeholder="عنوان السجل…"
          className="flex-1 min-w-[200px] rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-sm outline-none focus:border-[oklch(0.85_0.18_85_/_0.5)]"
        />
        <button
          disabled={create.isPending || !title.trim()}
          className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, oklch(0.92 0.18 90), oklch(0.7 0.22 55))",
            color: "oklch(0.13 0.02 270)",
          }}
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          إضافة
        </button>
      </form>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          لا توجد سجلات بعد — أضف أول سجل لك.
        </p>
      ) : (
        <ul className="divide-y divide-border/30">
          {records.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ar")}
                </div>
              </div>
              <button
                onClick={() => remove.mutate(r.id)}
                disabled={remove.isPending}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        تظهر هنا بياناتك فقط — كل مستخدم يرى مساحته الخاصة.{" "}
        <Link to="/" className="underline">
          العودة للرئيسية
        </Link>
      </p>
    </section>
  );
}
