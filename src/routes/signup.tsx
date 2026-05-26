import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HnAuthShell, HnField } from "@/components/hn/HnAuthShell";
import { Mail, Lock, User as UserIcon, Phone, Eye, EyeOff, UserPlus, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب HN — حساب موحّد لجميع خدمات HN" },
      { name: "description", content: "أنشئ حساب HN واحد واستخدمه في جميع خدمات HN: HN Chat, Driver, Souk, Studio, Video AI, DB Guard." },
    ],
  }),
  component: SignupPage,
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

function SignupPage() {
  const navigate = useNavigate();
  const { app, redirect } = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fromApp = useMemo(() => app || null, [app]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agree) { setError("يجب الموافقة على الشروط والأحكام."); return; }
    if (password.length < 8) { setError("كلمة المرور قصيرة (8 أحرف على الأقل)."); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/sso/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone ? `+213${phone.replace(/^0+/, "")}` : null,
          password,
          app: fromApp ?? undefined,
          redirect: redirect ?? undefined,
        }),
      });
      const json = (await res.json()) as SsoResponse;
      if (!res.ok || !json.ok) {
        const map: Record<string, string> = {
          email_taken: "هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول.",
          invalid_input: "البيانات غير صالحة.",
          redirect_not_allowed: "الموقع غير مصرّح به.",
          signup_failed: "تعذّر إنشاء الحساب. حاول مرة أخرى.",
        };
        setError(map[json.error ?? "signup_failed"] ?? "تعذّر إنشاء الحساب.");
        return;
      }
      // Redirect back to source with ticket
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
    <HnAuthShell title="إنشاء حساب جديد" subtitle="ابدأ رحلتك مع HN">
      {fromApp && (
        <div className="mb-4 rounded-xl px-3 py-2 text-xs text-center"
             style={{ background: "rgba(245,184,0,.08)", border: "1px solid rgba(245,184,0,.3)", color: "var(--hn-gold-bright)" }}>
          ستتم إعادتك إلى <strong>{fromApp}</strong> بعد التسجيل
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
        <HnField icon={<UserIcon size={18} />}>
          <input
            className="hn-input pr-12"
            placeholder="الاسم الكامل"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
          />
        </HnField>

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

        <div className="relative flex gap-2">
          <div className="flex items-center gap-2 rounded-2xl px-3"
               style={{ background: "var(--hn-input-bg)", border: "1px solid rgba(245,184,0,.18)", minWidth: 110 }}>
            <span className="text-xl">🇩🇿</span>
            <span className="font-bold" style={{ color: "var(--hn-gold-bright)", fontFamily: "Outfit, sans-serif" }}>+213</span>
          </div>
          <HnField icon={<Phone size={18} />}>
            <input
              type="tel"
              className="hn-input pr-12"
              placeholder="رقم الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
              maxLength={15}
            />
          </HnField>
        </div>

        <div className="relative">
          <HnField icon={<Lock size={18} />}>
            <input
              type={showPwd ? "text" : "password"}
              className="hn-input pr-12 pl-12"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </HnField>
          <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute top-1/2 -translate-y-1/2 left-4"
                  style={{ color: "var(--hn-text-muted)" }} aria-label="إظهار كلمة المرور">
            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="relative">
          <HnField icon={<Lock size={18} />}>
            <input
              type={showConfirm ? "text" : "password"}
              className="hn-input pr-12 pl-12"
              placeholder="تأكيد كلمة المرور"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </HnField>
          <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="absolute top-1/2 -translate-y-1/2 left-4"
                  style={{ color: "var(--hn-text-muted)" }} aria-label="إظهار التأكيد">
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer select-none"
               style={{ color: "var(--hn-text)" }}>
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 w-4 h-4 accent-amber-400"
          />
          <span>
            أوافق على <span className="hn-text-gold font-bold">الشروط والأحكام</span> و <span className="hn-text-gold font-bold">سياسة الخصوصية</span>
          </span>
        </label>

        {error && (
          <div className="rounded-xl px-3 py-2 text-sm text-center"
               style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.4)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="hn-btn-gold flex items-center justify-center gap-2">
          <UserPlus size={20} />
          {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
        </button>

        <div className="relative flex items-center gap-3 my-2">
          <div className="flex-1 h-px" style={{ background: "rgba(245,184,0,.2)" }} />
          <span className="text-xs" style={{ color: "var(--hn-text-muted)" }}>أو</span>
          <div className="flex-1 h-px" style={{ background: "rgba(245,184,0,.2)" }} />
        </div>

        <a
          href={`/login${typeof window !== "undefined" ? window.location.search : ""}`}
          className="hn-btn-outline flex items-center justify-center gap-2"
        >
          <ChevronLeft size={18} />
          لدي حساب بالفعل؟ <span className="hn-text-gold">تسجيل الدخول</span>
        </a>
      </form>
    </HnAuthShell>
  );
}
