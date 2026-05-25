import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Copy, CheckCircle2, ShieldCheck, Mail, User, Phone, Lock, KeyRound } from "lucide-react";
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
      { name: "description", content: "Unified HN Account for HN Chat, HN Driver, HN Souk, and DB-GUARD." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

type Step = "form" | "verify" | "done";

function RegisterPage() {
  const { source_app, redirect_url } = useSearch({ from: "/register" });
  const { t } = useTranslation();
  const register = useServerFn(registerHnAccount);
  const verify = useServerFn(verifyHnAccount);

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // post-register state
  const [code, setCode] = useState<string | null>(null); // hn_user_code
  const [otp, setOtp] = useState("");
  const [copied, setCopied] = useState(false);
  const [finalCode, setFinalCode] = useState<string | null>(null);

  const sourceLabel = source_app ?? "hn-account";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await register({
        data: {
          full_name: fullName,
          email,
          phone,
          password,
          source_app,
          redirect_url,
        },
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
        setFinalCode(res.hn_user_code);
        setStep("done");
        // Auto-redirect after 4s if redirect_url provided
        if (res.redirect_url && res.session_token) {
          const target = new URL(res.redirect_url);
          target.searchParams.set("hn_token", res.session_token);
          target.searchParams.set("hn_user_code", res.hn_user_code);
          setTimeout(() => {
            window.location.href = target.toString();
          }, 4000);
        }
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
          "radial-gradient(ellipse at top, oklch(0.18 0.04 80 / 0.4), transparent 60%), radial-gradient(ellipse at bottom, oklch(0.12 0.05 280 / 0.5), transparent 65%), oklch(0.08 0.02 270)",
      }}
    >
      {/* Neon grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.85 0.18 90 / 0.07) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.18 90 / 0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg font-brand text-sm font-black"
            style={{
              background: "linear-gradient(135deg, oklch(0.85 0.18 85), oklch(0.7 0.2 60))",
              color: "oklch(0.15 0.02 270)",
              boxShadow: "0 0 24px oklch(0.85 0.18 85 / 0.5)",
            }}
          >
            HN
          </div>
          <div>
            <div className="font-brand text-sm font-bold tracking-widest" style={{ color: "oklch(0.85 0.18 85)" }}>
              HN ACCOUNT
            </div>
            <div className="text-xs text-muted-foreground">{t("hn.unifiedFor", "Unified sign-in for HN apps")}</div>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="relative z-10 mx-auto flex max-w-md flex-col px-6 pb-16 pt-6">
        <div
          className="rounded-2xl border bg-card/40 p-7 backdrop-blur-xl"
          style={{
            borderColor: "oklch(0.85 0.18 85 / 0.25)",
            boxShadow:
              "0 0 0 1px oklch(0.85 0.18 85 / 0.08) inset, 0 30px 80px -20px oklch(0.85 0.18 85 / 0.25), 0 0 80px -10px oklch(0.62 0.27 295 / 0.25)",
          }}
        >
          {step === "form" && (
            <>
              <h1 className="font-brand text-2xl font-black tracking-tight" style={{ color: "oklch(0.85 0.18 85)" }}>
                {t("hn.title", "Create your HN Account")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("hn.subtitle", "One identity across all HN platforms.")}
                {source_app && (
                  <>
                    {" "}<span className="font-mono text-xs" style={{ color: "oklch(0.7 0.2 230)" }}>· {sourceLabel}</span>
                  </>
                )}
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Field icon={<User className="h-4 w-4" />} label={t("hn.fullName", "Full name")}>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="hn-input" placeholder="Jane Doe" />
                </Field>
                <Field icon={<Mail className="h-4 w-4" />} label={t("hn.email", "Email")}>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="hn-input" placeholder="you@example.com" />
                </Field>
                <Field icon={<Phone className="h-4 w-4" />} label={t("hn.phone", "Phone (optional)")}>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="hn-input" placeholder="+1 555 0100" />
                </Field>
                <Field icon={<Lock className="h-4 w-4" />} label={t("hn.password", "Password")}>
                  <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="hn-input" placeholder="••••••••" />
                </Field>

                {error && (
                  <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "oklch(0.62 0.25 20 / 0.5)", color: "oklch(0.8 0.2 20)" }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="hn-btn-gold">
                  {loading ? t("actions.loading") : t("hn.createAccount", "Create account")}
                </button>
              </form>
            </>
          )}

          {step === "verify" && code && (
            <>
              <div
                className="mb-5 rounded-xl border p-4"
                style={{
                  borderColor: "oklch(0.85 0.18 85 / 0.4)",
                  background: "oklch(0.85 0.18 85 / 0.06)",
                }}
              >
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("hn.yourCode", "Your access code")}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="flex-1 font-mono text-2xl font-bold"
                    style={{ color: "oklch(0.9 0.18 85)", textShadow: "0 0 20px oklch(0.85 0.18 85 / 0.6)" }}
                  >
                    {code}
                  </div>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition"
                    style={{ borderColor: "oklch(0.85 0.18 85 / 0.5)", color: "oklch(0.85 0.18 85)" }}
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t("actions.copied") : t("actions.copy")}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("hn.saveCode", "Save this code — it is your key to your account.")}
                </p>
              </div>

              <h2 className="font-brand text-xl font-bold" style={{ color: "oklch(0.85 0.18 85)" }}>
                {t("hn.verifyTitle", "Verify your email")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("hn.verifySubtitle", "We sent a 6-digit code to")} <span className="font-mono">{email}</span>
              </p>

              <form onSubmit={onVerify} className="mt-5 space-y-4">
                <Field icon={<KeyRound className="h-4 w-4" />} label={t("hn.otpLabel", "Verification code")}>
                  <input
                    required
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="hn-input font-mono tracking-[0.5em] text-center text-lg"
                    placeholder="000000"
                  />
                </Field>

                {error && (
                  <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "oklch(0.62 0.25 20 / 0.5)", color: "oklch(0.8 0.2 20)" }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || otp.length !== 6} className="hn-btn-gold">
                  {loading ? t("actions.loading") : t("hn.verifyButton", "Verify & continue")}
                </button>
              </form>
            </>
          )}

          {step === "done" && finalCode && (
            <div className="text-center">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: "oklch(0.72 0.2 155 / 0.15)",
                  boxShadow: "0 0 40px oklch(0.72 0.2 155 / 0.5)",
                }}
              >
                <ShieldCheck className="h-7 w-7" style={{ color: "oklch(0.78 0.2 155)" }} />
              </div>
              <h2 className="mt-4 font-brand text-2xl font-black" style={{ color: "oklch(0.85 0.18 85)" }}>
                {t("hn.welcome", "Welcome to HN")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("hn.doneSubtitle", "Your account is verified.")}
              </p>
              <div className="mt-5 rounded-xl border p-4" style={{ borderColor: "oklch(0.85 0.18 85 / 0.4)" }}>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("hn.userCode", "User code")}
                </div>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <span className="font-mono text-xl font-bold" style={{ color: "oklch(0.9 0.18 85)" }}>
                    {finalCode}
                  </span>
                  <button onClick={copyCode} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                    style={{ borderColor: "oklch(0.85 0.18 85 / 0.5)", color: "oklch(0.85 0.18 85)" }}>
                    {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                {redirect_url
                  ? t("hn.redirecting", "Redirecting you back to {{app}}…", { app: sourceLabel })
                  : t("hn.allSet", "You can close this tab.")}
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("hn.footer", "Protected by HN Account · One key for every HN service")}
        </p>
      </main>

      <style>{`
        .hn-input {
          width: 100%;
          background: oklch(0.12 0.03 270 / 0.6);
          border: 1px solid oklch(0.85 0.18 85 / 0.18);
          border-radius: 0.625rem;
          padding: 0.625rem 0.75rem 0.625rem 2.25rem;
          color: oklch(0.97 0.01 90);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .hn-input:focus {
          border-color: oklch(0.85 0.18 85 / 0.7);
          box-shadow: 0 0 0 3px oklch(0.85 0.18 85 / 0.12);
        }
        .hn-btn-gold {
          width: 100%;
          padding: 0.7rem 1rem;
          border-radius: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: oklch(0.13 0.02 270);
          background: linear-gradient(135deg, oklch(0.88 0.18 85), oklch(0.72 0.2 60));
          box-shadow: 0 10px 30px -10px oklch(0.85 0.18 85 / 0.6), 0 0 30px -5px oklch(0.85 0.18 85 / 0.4);
          transition: transform 0.1s, box-shadow 0.2s, opacity 0.2s;
        }
        .hn-btn-gold:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 36px -10px oklch(0.85 0.18 85 / 0.75), 0 0 40px -5px oklch(0.85 0.18 85 / 0.55);
        }
        .hn-btn-gold:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.85 0.18 85 / 0.7)" }}>
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}
