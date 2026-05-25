import { createFileRoute, useSearch, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  Copy,
  CheckCircle2,
  ShieldCheck,
  Mail,
  User,
  Phone,
  Lock,
  KeyRound,
  MessageCircle,
  Car,
  ShoppingCart,
  Camera,
  PlayCircle,
  Database,
  ChevronLeft,
  Eye,
  EyeOff,
  RefreshCw,
  Bell,
  Headphones,
  UserPlus,
} from "lucide-react";
import { registerHnAccount, verifyHnAccount } from "@/lib/hn-account/register.functions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const searchSchema = z.object({
  source_app: z.string().optional(),
  redirect_url: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "HN Account — Sign up" },
      { name: "description", content: "Unified HN Account for HN Chat, HN Driver, HN Souk, HN Studio, HN Video AI and DB-GUARD." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

type Step = "form" | "verify" | "done";

const HN_APPS = [
  { name: "HN Chat", icon: MessageCircle, color: "oklch(0.72 0.2 50)", glow: "oklch(0.72 0.2 50 / 0.5)" },
  { name: "HN Driver", icon: Car, color: "oklch(0.7 0.2 240)", glow: "oklch(0.7 0.2 240 / 0.5)" },
  { name: "HN Souk", icon: ShoppingCart, color: "oklch(0.7 0.25 0)", glow: "oklch(0.7 0.25 0 / 0.5)" },
  { name: "HN Studio", icon: Camera, color: "oklch(0.65 0.27 310)", glow: "oklch(0.65 0.27 310 / 0.5)" },
  { name: "HN Video AI", icon: PlayCircle, color: "oklch(0.65 0.25 25)", glow: "oklch(0.65 0.25 25 / 0.5)" },
  { name: "DB Guard", icon: Database, color: "oklch(0.7 0.18 195)", glow: "oklch(0.7 0.18 195 / 0.5)" },
];

function RegisterPage() {
  const { source_app, redirect_url } = useSearch({ from: "/register" });
  const { t } = useTranslation();
  const register = useServerFn(registerHnAccount);
  const verify = useServerFn(verifyHnAccount);
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [code, setCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [copied, setCopied] = useState(false);
  const [finalCode, setFinalCode] = useState<string | null>(null);

  const sourceLabel = source_app ?? "hn-account";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t("hn.errors.passwordMismatch", "Passwords do not match"));
      return;
    }
    if (!agreed) {
      setError(t("hn.errors.mustAgree", "You must accept the terms to continue."));
      return;
    }
    setLoading(true);
    try {
      const res = await register({
        data: { full_name: fullName, email, phone, password, source_app, redirect_url },
      });
      if (!res.ok) {
        setError(res.error === "email_taken" ? t("hn.errors.emailTaken") : t("hn.errors.internal"));
      } else {
        setCode(res.hn_user_code);
        setStep("verify");
      }
    } catch (err) {
      setError((err as Error).message || "error");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verify({ data: { email, code: otp } });
      if (!res.ok) {
        setError(res.error === "too_many_attempts" ? t("hn.errors.tooMany") : t("hn.errors.invalidCode"));
      } else {
        // Stash provisioning details in sessionStorage (avoid leaking API key in URL)
        try {
          sessionStorage.setItem("hn_account_created", JSON.stringify({
            hn_user_code: res.hn_user_code,
            user_id: res.user_id,
            workspace_id: res.workspace_id,
            database_id: res.database_id,
            api_key: res.api_key ?? undefined,
            full_name: res.full_name,
            email: res.email,
          }));
        } catch { /* ignore */ }

        if (res.redirect_url && res.session_token) {
          const target = new URL(res.redirect_url);
          target.searchParams.set("hn_token", res.session_token);
          target.searchParams.set("hn_user_code", res.hn_user_code);
          window.location.href = target.toString();
          return;
        }
        await navigate({ to: "/account-created" });
        return;
      }

    } catch (err) {
      setError((err as Error).message || "error");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!code && !finalCode) return;
    await navigator.clipboard.writeText((finalCode ?? code)!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden text-foreground"
      style={{
        background:
          "radial-gradient(ellipse at 20% 10%, oklch(0.22 0.06 80 / 0.35), transparent 55%), radial-gradient(ellipse at 90% 90%, oklch(0.18 0.08 280 / 0.45), transparent 60%), oklch(0.07 0.02 270)",
      }}
    >
      {/* Neon grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.85 0.18 90 / 0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.18 90 / 0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
        }}
      />
      {/* Floating glow orbs */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.85 0.18 85 / 0.18), transparent 70%)" }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.6 0.27 295 / 0.18), transparent 70%)" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-3">
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
            <div className="font-brand text-sm font-bold tracking-[0.25em]" style={{ color: "oklch(0.85 0.18 85)" }}>
              HN ACCOUNT
            </div>
            <div className="text-[11px] text-muted-foreground">{t("hn.unifiedFor")}</div>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto grid max-w-7xl gap-10 px-6 pb-12 pt-4 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:pt-8">
        {/* Left: Branding panel */}
        <section className="hidden lg:flex flex-col justify-center">
          <div
            className="font-brand text-[5.5rem] font-black leading-[0.95] tracking-tight"
            style={{
              background: "linear-gradient(135deg, oklch(0.92 0.18 90), oklch(0.7 0.22 55))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 0 60px oklch(0.85 0.18 85 / 0.35)",
            }}
          >
            {t("hn.brand.welcome", "Welcome to")}
            <br />
            {t("hn.brand.group", "the HN universe")}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-px flex-1 max-w-[80px]" style={{ background: "linear-gradient(90deg, transparent, oklch(0.85 0.18 85))" }} />
            <span className="text-sm tracking-widest" style={{ color: "oklch(0.85 0.18 85)" }}>
              {t("hn.brand.oneAccountAll", "One account for every HN service")}
            </span>
          </div>

          {/* App constellation */}
          <div className="relative mt-12 h-[360px]">
            {/* Center shield */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="relative flex h-32 w-32 items-center justify-center rounded-3xl"
                style={{
                  background: "linear-gradient(135deg, oklch(0.88 0.18 85), oklch(0.68 0.2 55))",
                  boxShadow: "0 0 80px oklch(0.85 0.18 85 / 0.55), 0 0 0 1px oklch(0.85 0.18 85 / 0.4) inset",
                }}
              >
                <ShieldCheck className="h-16 w-16" style={{ color: "oklch(0.13 0.02 270)" }} />
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-3xl blur-2xl"
                  style={{ background: "oklch(0.85 0.18 85 / 0.6)" }}
                />
              </div>
            </div>

            {/* Orbiting app pills */}
            {HN_APPS.map((app, i) => {
              const positions = [
                { top: "8%", left: "8%" },
                { top: "8%", right: "8%" },
                { top: "42%", left: "0%" },
                { top: "42%", right: "0%" },
                { bottom: "5%", left: "16%" },
                { bottom: "5%", right: "16%" },
              ];
              const pos = positions[i];
              const Icon = app.icon;
              return (
                <div key={app.name} className="absolute" style={pos}>
                  <div
                    className="flex flex-col items-center gap-2"
                    style={{ animation: `hn-float 6s ease-in-out infinite ${i * 0.5}s` }}
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border backdrop-blur"
                      style={{
                        background: `linear-gradient(135deg, ${app.color}, oklch(0.2 0.04 270))`,
                        borderColor: `${app.color}`,
                        boxShadow: `0 0 28px ${app.glow}`,
                      }}
                    >
                      <Icon className="h-7 w-7" style={{ color: "oklch(0.98 0 0)" }} />
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide text-foreground/90">{app.name}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature row */}
          <div className="mt-8 grid grid-cols-4 gap-3">
            {[
              { icon: ShieldCheck, label: t("hn.features.secure", "Secure account") },
              { icon: RefreshCw, label: t("hn.features.instant", "Instant access") },
              { icon: Bell, label: t("hn.features.notifs", "Smart alerts") },
              { icon: Headphones, label: t("hn.features.support", "24/7 support") },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-xl border p-3 backdrop-blur"
                style={{
                  borderColor: "oklch(0.85 0.18 85 / 0.18)",
                  background: "oklch(0.12 0.03 270 / 0.5)",
                }}
              >
                <f.icon className="h-5 w-5" style={{ color: "oklch(0.85 0.18 85)" }} />
                <div className="mt-2 text-[11px] leading-tight text-foreground/85">{f.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Form card */}
        <section className="flex items-center">
          <div
            className="relative w-full rounded-3xl border p-7 backdrop-blur-xl sm:p-9"
            style={{
              borderColor: "oklch(0.85 0.18 85 / 0.28)",
              background:
                "linear-gradient(180deg, oklch(0.12 0.03 270 / 0.7), oklch(0.08 0.02 270 / 0.85))",
              boxShadow:
                "0 0 0 1px oklch(0.85 0.18 85 / 0.1) inset, 0 40px 90px -20px oklch(0.85 0.18 85 / 0.25), 0 0 100px -10px oklch(0.62 0.27 295 / 0.25)",
            }}
          >
            {step === "form" && (
              <>
                <div className="text-center">
                  <h1
                    className="font-brand text-3xl font-black tracking-tight"
                    style={{ color: "oklch(0.92 0.18 90)" }}
                  >
                    {t("hn.title")}
                  </h1>
                  <div className="mx-auto mt-2 h-[2px] w-20 rounded-full"
                    style={{ background: "linear-gradient(90deg, transparent, oklch(0.85 0.18 85), transparent)" }} />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t("hn.brand.startJourney", "Start your journey with HN")}
                    {source_app && (
                      <span className="ml-1 font-mono text-xs" style={{ color: "oklch(0.7 0.2 230)" }}>
                        · {sourceLabel}
                      </span>
                    )}
                  </p>
                </div>

                <form onSubmit={onSubmit} className="mt-7 space-y-3.5">
                  <IconField icon={<User className="h-4 w-4" />}>
                    <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="hn-input" placeholder={t("hn.fullName")} />
                  </IconField>
                  <IconField icon={<Mail className="h-4 w-4" />}>
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="hn-input" placeholder={t("hn.email")} />
                  </IconField>

                  {/* Phone with country selector */}
                  <div className="hn-row">
                    <div className="hn-country">
                      <span className="text-base">🇩🇿</span>
                      <span className="text-sm font-medium">+213</span>
                    </div>
                    <div className="hn-row-divider" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="hn-input hn-input-flat"
                      placeholder={t("hn.phone")}
                      inputMode="tel"
                    />
                    <span className="hn-row-icon"><Phone className="h-4 w-4" /></span>
                  </div>

                  <IconField icon={<Lock className="h-4 w-4" />} trailing={
                    <button type="button" onClick={() => setShowPwd((v) => !v)} className="hn-trailing-btn" aria-label="toggle password">
                      {showPwd ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  }>
                    <input required type={showPwd ? "text" : "password"} minLength={8}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="hn-input hn-input-trail" placeholder={t("hn.password")} />
                  </IconField>

                  <IconField icon={<Lock className="h-4 w-4" />} trailing={
                    <button type="button" onClick={() => setShowPwd2((v) => !v)} className="hn-trailing-btn" aria-label="toggle confirm password">
                      {showPwd2 ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  }>
                    <input required type={showPwd2 ? "text" : "password"} minLength={8}
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="hn-input hn-input-trail" placeholder={t("hn.confirmPassword", "Confirm password")} />
                  </IconField>

                  <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[oklch(0.85_0.18_85)]"
                    />
                    <span>
                      {t("hn.agreeTerms", "I agree to the Terms and Privacy Policy")}
                    </span>
                  </label>

                  {error && (
                    <div className="rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: "oklch(0.62 0.25 20 / 0.5)", color: "oklch(0.85 0.2 25)" }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="hn-btn-gold mt-1">
                    <UserPlus className="h-4 w-4" />
                    <span>{loading ? t("actions.loading") : t("hn.createAccount")}</span>
                  </button>

                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1" style={{ background: "oklch(0.85 0.18 85 / 0.18)" }} />
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      {t("hn.or", "or")}
                    </span>
                    <div className="h-px flex-1" style={{ background: "oklch(0.85 0.18 85 / 0.18)" }} />
                  </div>

                  <Link
                    to="/auth/login"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition hover:bg-foreground/5"
                    style={{ borderColor: "oklch(0.85 0.18 85 / 0.35)" }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-muted-foreground">
                      {t("hn.alreadyHave", "Already have an account?")}
                    </span>
                    <span className="font-semibold" style={{ color: "oklch(0.88 0.18 85)" }}>
                      {t("hn.login", "Sign in")}
                    </span>
                  </Link>
                </form>
              </>
            )}

            {step === "verify" && code && (
              <>
                <div
                  className="mb-5 rounded-xl border p-4"
                  style={{ borderColor: "oklch(0.85 0.18 85 / 0.4)", background: "oklch(0.85 0.18 85 / 0.06)" }}
                >
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("hn.yourCode")}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 font-mono text-2xl font-bold"
                      style={{ color: "oklch(0.92 0.18 90)", textShadow: "0 0 20px oklch(0.85 0.18 85 / 0.6)" }}>
                      {code}
                    </div>
                    <button type="button" onClick={copyCode}
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition"
                      style={{ borderColor: "oklch(0.85 0.18 85 / 0.5)", color: "oklch(0.85 0.18 85)" }}>
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? t("actions.copied") : t("actions.copy")}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{t("hn.saveCode")}</p>
                </div>

                <h2 className="font-brand text-xl font-bold" style={{ color: "oklch(0.88 0.18 85)" }}>
                  {t("hn.verifyTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("hn.verifySubtitle")} <span className="font-mono">{email}</span>
                </p>

                <form onSubmit={onVerify} className="mt-5 space-y-4">
                  <IconField icon={<KeyRound className="h-4 w-4" />}>
                    <input required inputMode="numeric" pattern="\d{6}" maxLength={6}
                      value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="hn-input font-mono tracking-[0.5em] text-center text-lg" placeholder="000000" />
                  </IconField>
                  {error && (
                    <div className="rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: "oklch(0.62 0.25 20 / 0.5)", color: "oklch(0.85 0.2 25)" }}>{error}</div>
                  )}
                  <button type="submit" disabled={loading || otp.length !== 6} className="hn-btn-gold">
                    <span>{loading ? t("actions.loading") : t("hn.verifyButton")}</span>
                  </button>
                </form>
              </>
            )}

            {step === "done" && finalCode && (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: "oklch(0.72 0.2 155 / 0.15)", boxShadow: "0 0 40px oklch(0.72 0.2 155 / 0.5)" }}>
                  <ShieldCheck className="h-8 w-8" style={{ color: "oklch(0.78 0.2 155)" }} />
                </div>
                <h2 className="mt-4 font-brand text-2xl font-black" style={{ color: "oklch(0.88 0.18 85)" }}>
                  {t("hn.welcome")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("hn.doneSubtitle")}</p>
                <div className="mt-5 rounded-xl border p-4" style={{ borderColor: "oklch(0.85 0.18 85 / 0.4)" }}>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("hn.userCode")}</div>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <span className="font-mono text-xl font-bold" style={{ color: "oklch(0.92 0.18 90)" }}>{finalCode}</span>
                    <button onClick={copyCode} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                      style={{ borderColor: "oklch(0.85 0.18 85 / 0.5)", color: "oklch(0.85 0.18 85)" }}>
                      {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <p className="mt-5 text-xs text-muted-foreground">
                  {redirect_url
                    ? t("hn.redirecting", { app: sourceLabel })
                    : t("hn.allSet")}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Bottom apps strip */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-10 lg:px-10">
        <div className="mx-auto flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, oklch(0.85 0.18 85 / 0.4), transparent)" }} />
          <p className="text-xs tracking-wider text-muted-foreground">
            {t("hn.useInAll", "Use this account across all HN services")}
          </p>
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, oklch(0.85 0.18 85 / 0.4), transparent)" }} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {HN_APPS.map((app) => {
            const Icon = app.icon;
            return (
              <div key={app.name} className="flex flex-col items-center gap-2">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                  style={{
                    background: `linear-gradient(135deg, ${app.color}, oklch(0.18 0.04 270))`,
                    borderColor: app.color,
                    boxShadow: `0 0 22px ${app.glow}`,
                  }}
                >
                  <Icon className="h-6 w-6" style={{ color: "oklch(0.98 0 0)" }} />
                </div>
                <span className="text-[11px] font-medium text-foreground/80">{app.name}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" style={{ color: "oklch(0.85 0.18 85)" }} />
          <span>{t("hn.protected", "Your account is protected by HN's best-in-class security")}</span>
        </div>
      </section>

      <style>{`
        @keyframes hn-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .hn-input {
          width: 100%;
          background: oklch(0.1 0.02 270 / 0.7);
          border: 1px solid oklch(0.85 0.18 85 / 0.18);
          border-radius: 0.85rem;
          padding-block: 0.85rem;
          padding-inline-start: 1rem;
          padding-inline-end: 2.5rem;
          color: oklch(0.97 0.01 90);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .hn-input::placeholder { color: oklch(0.65 0.02 270); }
        .hn-input:focus {
          border-color: oklch(0.85 0.18 85 / 0.7);
          box-shadow: 0 0 0 3px oklch(0.85 0.18 85 / 0.12);
          background: oklch(0.1 0.02 270 / 0.9);
        }
        .hn-input-trail { padding-inline-start: 2.75rem; }
        .hn-input-flat {
          border: none;
          background: transparent;
          border-radius: 0;
          padding-inline-start: 0.5rem;
          padding-inline-end: 2.5rem;
          flex: 1;
        }
        .hn-input-flat:focus { box-shadow: none; background: transparent; }
        .hn-row {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          background: oklch(0.1 0.02 270 / 0.7);
          border: 1px solid oklch(0.85 0.18 85 / 0.18);
          border-radius: 0.85rem;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .hn-row:focus-within {
          border-color: oklch(0.85 0.18 85 / 0.7);
          box-shadow: 0 0 0 3px oklch(0.85 0.18 85 / 0.12);
        }
        .hn-country {
          display: flex; align-items: center; gap: 0.4rem;
          padding-inline: 0.85rem; height: 100%;
          color: oklch(0.92 0.05 90);
        }
        .hn-row-divider {
          width: 1px; align-self: stretch;
          background: oklch(0.85 0.18 85 / 0.2);
          margin-block: 0.5rem;
        }
        .hn-row-icon {
          position: absolute; inset-inline-end: 0.85rem; top: 50%;
          transform: translateY(-50%);
          color: oklch(0.85 0.18 85 / 0.7);
          pointer-events: none;
        }
        .hn-trailing-btn {
          position: absolute; inset-inline-start: 0.6rem; top: 50%;
          transform: translateY(-50%);
          color: oklch(0.75 0.05 90);
          padding: 0.3rem; border-radius: 0.4rem;
          transition: color 0.15s, background 0.15s;
        }
        .hn-trailing-btn:hover { color: oklch(0.88 0.18 85); background: oklch(0.85 0.18 85 / 0.08); }
        .hn-btn-gold {
          width: 100%;
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.95rem 1rem;
          border-radius: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: oklch(0.13 0.02 270);
          background: linear-gradient(135deg, oklch(0.92 0.18 90), oklch(0.7 0.22 55));
          box-shadow: 0 14px 36px -10px oklch(0.85 0.18 85 / 0.7), 0 0 36px -5px oklch(0.85 0.18 85 / 0.5);
          transition: transform 0.1s, box-shadow 0.2s, opacity 0.2s;
        }
        .hn-btn-gold:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 42px -10px oklch(0.85 0.18 85 / 0.8), 0 0 50px -5px oklch(0.85 0.18 85 / 0.65);
        }
        .hn-btn-gold:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function IconField({
  icon,
  children,
  trailing,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      <span
        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
        style={{ color: "oklch(0.85 0.18 85 / 0.75)", insetInlineEnd: "1rem" }}
      >
        {icon}
      </span>
      {trailing}
    </div>
  );
}
