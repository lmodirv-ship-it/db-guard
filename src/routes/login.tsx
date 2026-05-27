import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HnAuthShell, HnField } from "@/components/hn/HnAuthShell";
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";


export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — HN" },
      { name: "description", content: "سجّل دخولك بحساب HN الموحّد للوصول إلى جميع خدمات HN." },
    ],
  }),
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    app: typeof search.app === "string" ? search.app : undefined,
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
});

type SsoResponse = {
  ok: boolean;
  error?: string;
  user?: { hn_user_code: string; full_name: string; email: string };
  ticket?: string;
  redirect_url?: string;
};

function LoginPage() {
  const navigate = useNavigate();
  const { app, redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fromApp = useMemo(() => app || null, [app]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1) Try platform owner/user login first (Neon, sets hn_session cookie).
      //    Skip when external SSO redirect is requested.
      if (!fromApp && !redirect) {
        const ownerRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        if (ownerRes.ok) {
          const data = await ownerRes.json().catch(() => null);
          if (data?.ok) {
            const isOwner = data?.user?.role === "owner";
            window.location.href = isOwner ? "/owner" : "/dashboard";
            return;
          }
        }
      }

      // 2) Fallback: SSO login (hn_users, ticket-based).
      const res = await fetch("/api/sso/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          app: fromApp ?? undefined,
          redirect: redirect ?? undefined,
        }),
      });
      const json = (await res.json()) as SsoResponse;
      if (!res.ok || !json.ok) {
        const map: Record<string, string> = {
          invalid_credentials: "البريد أو كلمة المرور غير صحيحة.",
          invalid_input: "البيانات غير صالحة.",
          redirect_not_allowed: "الموقع غير مصرّح به.",
          login_failed: "تعذّر تسجيل الدخول.",
        };
        setError(map[json.error ?? "login_failed"] ?? "تعذّر تسجيل الدخول.");
        return;
      }
      if (json.redirect_url && json.ticket) {
        const back = new URL(json.redirect_url);
        back.searchParams.set("hn_ticket", json.ticket);
        window.location.href = back.toString();
      } else {
        navigate({ to: "/" });
      }
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <HnAuthShell title="تسجيل الدخول" subtitle="أهلًا بعودتك إلى HN">
      {fromApp && (
        <div className="mb-4 rounded-xl px-3 py-2 text-xs text-center"
             style={{ background: "rgba(245,184,0,.08)", border: "1px solid rgba(245,184,0,.3)", color: "var(--hn-gold-bright)" }}>
          ستتم إعادتك إلى <strong>{fromApp}</strong> بعد الدخول
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
        <HnField icon={<Mail size={18} />}>
          <input
            type="email"
            className="hn-input pr-12"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </HnField>

        <div className="relative">
          <HnField icon={<Lock size={18} />}>
            <input
              type={showPwd ? "text" : "password"}
              className="hn-input pr-12 pl-12"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </HnField>
          <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute top-1/2 -translate-y-1/2 left-4"
                  style={{ color: "var(--hn-text-muted)" }}>
            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <div className="rounded-xl px-3 py-2 text-sm text-center"
               style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.4)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="hn-btn-gold flex items-center justify-center gap-2">
          <LogIn size={20} />
          {loading ? "جاري الدخول..." : "تسجيل الدخول"}
        </button>

        <button
          type="button"
          onClick={async () => {
            setError(null);
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (result.error) {
              setError("تعذّر تسجيل الدخول بحساب Google.");
              return;
            }
            if (result.redirected) return;
            window.location.href = "/dashboard";
          }}
          className="hn-btn-outline flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          المتابعة باستخدام Google
        </button>


        <div className="relative flex items-center gap-3 my-2">
          <div className="flex-1 h-px" style={{ background: "rgba(245,184,0,.2)" }} />
          <span className="text-xs" style={{ color: "var(--hn-text-muted)" }}>أو</span>
          <div className="flex-1 h-px" style={{ background: "rgba(245,184,0,.2)" }} />
        </div>

        <a
          href={`/signup${typeof window !== "undefined" ? window.location.search : ""}`}
          className="hn-btn-outline flex items-center justify-center gap-2"
        >
          <UserPlus size={18} />
          ليس لدي حساب؟ <span className="hn-text-gold">إنشاء حساب جديد</span>
        </a>
      </form>
    </HnAuthShell>
  );
}
