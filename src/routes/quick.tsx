import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, CheckCircle2, UserPlus, KeyRound, ArrowLeft, ShieldCheck } from "lucide-react";
import { registerSimpleUser, loginByLoginId } from "@/lib/id-auth/auth.functions";

export const Route = createFileRoute("/quick")({
  head: () => ({
    meta: [
      { title: "تسجيل سريع برقم ID — DB·GUARD" },
      { name: "description", content: "نظام تسجيل مؤقت برقم ID بدون كلمة مرور" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuickPage,
});

function QuickPage() {
  return (
    <div
      className="relative min-h-screen overflow-hidden text-foreground"
      style={{
        background:
          "radial-gradient(ellipse at 20% 10%, oklch(0.22 0.06 80 / 0.35), transparent 55%), radial-gradient(ellipse at 90% 90%, oklch(0.18 0.08 280 / 0.45), transparent 60%), oklch(0.07 0.02 270)",
      }}
      dir="rtl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.85 0.18 90 / 0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.18 90 / 0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <Link to="/" className="flex items-center gap-3 text-foreground/90 hover:text-foreground">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl font-brand text-sm font-black"
            style={{
              background: "linear-gradient(135deg, oklch(0.88 0.18 85), oklch(0.68 0.2 55))",
              color: "oklch(0.13 0.02 270)",
              boxShadow: "0 0 28px oklch(0.85 0.18 85 / 0.55)",
            }}
          >
            HN
          </div>
          <div>
            <div className="font-brand text-sm font-bold tracking-[0.2em]" style={{ color: "oklch(0.85 0.18 85)" }}>
              HN ID
            </div>
            <div className="text-[11px] text-muted-foreground">تسجيل مؤقت برقم</div>
          </div>
        </Link>
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          الرئيسية
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid max-w-5xl gap-8 px-6 pb-16 lg:grid-cols-2 lg:px-10">
        <RegisterCard />
        <LoginCard />
      </main>
    </div>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="relative w-full rounded-3xl border p-7 backdrop-blur-xl sm:p-9"
      style={{
        borderColor: "oklch(0.85 0.18 85 / 0.28)",
        background: "linear-gradient(180deg, oklch(0.12 0.03 270 / 0.7), oklch(0.08 0.02 270 / 0.85))",
        boxShadow:
          "0 0 0 1px oklch(0.85 0.18 85 / 0.1) inset, 0 30px 70px -20px oklch(0.85 0.18 85 / 0.2)",
      }}
    >
      {children}
    </section>
  );
}

function RegisterCard() {
  const navigate = useNavigate();
  const register = useServerFn(registerSimpleUser);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginId, setLoginId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await register({ data: { full_name: fullName, email, phone } });
      if (!res.ok) {
        setError(res.error === "email_taken" ? "هذا الإيميل مسجل مسبقًا." : "حدث خطأ، حاول مرة أخرى.");
      } else {
        setLoginId(res.login_id);
      }
    } catch (err) {
      setError((err as Error).message || "خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!loginId) return;
    await navigator.clipboard.writeText(loginId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <CardShell>
      <h2 className="font-brand text-2xl font-black tracking-tight" style={{ color: "oklch(0.92 0.18 90)" }}>
        إنشاء حساب
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">سجل معلوماتك واحصل على رقم ID خاص بك للدخول.</p>

      {!loginId ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-3.5">
          <Field label="الاسم الكامل">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              minLength={2}
              maxLength={120}
              className="hn-quick-input"
              placeholder="مثال: أحمد محمد"
            />
          </Field>
          <Field label="الإيميل">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="hn-quick-input"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="رقم الهاتف (اختياري)">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              maxLength={40}
              className="hn-quick-input"
              placeholder="+213…"
            />
          </Field>
          {error && (
            <div
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "oklch(0.62 0.25 20 / 0.5)", color: "oklch(0.85 0.2 25)" }}
            >
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="hn-btn-gold mt-2">
            <UserPlus className="h-4 w-4" />
            <span>{loading ? "جاري الإنشاء…" : "إنشاء حساب"}</span>
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: "oklch(0.85 0.18 85 / 0.4)",
              background: "linear-gradient(135deg, oklch(0.18 0.06 80 / 0.4), oklch(0.1 0.02 270 / 0.6))",
            }}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: "oklch(0.85 0.18 85)" }}>
              <ShieldCheck className="h-4 w-4" />
              رقم الدخول الخاص بك
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <code
                className="font-brand text-3xl font-black tracking-widest"
                style={{ color: "oklch(0.95 0.16 90)" }}
              >
                {loginId}
              </code>
              <button onClick={copy} className="hn-btn-ghost" type="button">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? "تم النسخ" : "Copy"}</span>
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              احفظ هذا الرقم — ستستعمله لاحقًا للدخول إلى لوحتك.
            </p>
          </div>
          <button
            type="button"
            className="hn-btn-gold"
            onClick={() => navigate({ to: "/quick-dashboard" })}
          >
            الذهاب إلى لوحتي
          </button>
        </div>
      )}

      <style>{`
        .hn-quick-input{width:100%;border-radius:0.75rem;border:1px solid oklch(0.85 0.18 85 / 0.18);background:oklch(0.1 0.02 270 / 0.6);color:oklch(0.96 0.02 90);padding:0.7rem 0.9rem;font-size:0.95rem;outline:none;transition:border-color .15s, box-shadow .15s;}
        .hn-quick-input:focus{border-color:oklch(0.85 0.18 85 / 0.55);box-shadow:0 0 0 3px oklch(0.85 0.18 85 / 0.15);}
        .hn-btn-gold{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.8rem 1rem;border-radius:0.9rem;font-weight:700;color:oklch(0.13 0.02 270);background:linear-gradient(135deg,oklch(0.92 0.18 90),oklch(0.7 0.22 55));box-shadow:0 0 24px oklch(0.85 0.18 85 / 0.4);transition:transform .1s, opacity .15s;}
        .hn-btn-gold:hover{opacity:0.95;}
        .hn-btn-gold:active{transform:translateY(1px);}
        .hn-btn-gold:disabled{opacity:0.6;cursor:not-allowed;}
        .hn-btn-ghost{display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 0.8rem;border-radius:0.6rem;border:1px solid oklch(0.85 0.18 85 / 0.35);color:oklch(0.92 0.18 90);background:oklch(0.1 0.02 270 / 0.6);font-size:0.85rem;}
        .hn-btn-ghost:hover{background:oklch(0.85 0.18 85 / 0.12);}
      `}</style>
    </CardShell>
  );
}

function LoginCard() {
  const navigate = useNavigate();
  const login = useServerFn(loginByLoginId);
  const [loginId, setLoginId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login({ data: { login_id: loginId } });
      if (!res.ok) {
        setError("رقم الدخول غير صحيح");
      } else {
        navigate({ to: "/quick-dashboard" });
      }
    } catch {
      setError("رقم الدخول غير صحيح");
    } finally {
      setLoading(false);
    }
  }

  return (
    <CardShell>
      <h2 className="font-brand text-2xl font-black tracking-tight" style={{ color: "oklch(0.92 0.18 90)" }}>
        الدخول برقم ID
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">أدخل رقم الدخول الذي حصلت عليه عند التسجيل.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3.5">
        <Field label="رقم الدخول">
          <input
            required
            value={loginId}
            onChange={(e) => setLoginId(e.target.value.toUpperCase())}
            placeholder="ID######"
            className="hn-quick-input font-mono tracking-widest"
            maxLength={12}
          />
        </Field>
        {error && (
          <div
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "oklch(0.62 0.25 20 / 0.5)", color: "oklch(0.85 0.2 25)" }}
          >
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="hn-btn-gold mt-2">
          <KeyRound className="h-4 w-4" />
          <span>{loading ? "جاري الدخول…" : "دخول"}</span>
        </button>
      </form>
    </CardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
