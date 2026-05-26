import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requestOtp, verifyOtp } from "@/lib/auth/otp.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const verifySearchSchema = z.object({ email: z.string().email() });

export const Route = createFileRoute("/auth/verify")({
  head: () => ({ meta: [{ title: "Verify — DB-GUARD" }] }),
  validateSearch: verifySearchSchema,
  component: OtpVerifyPage,
});

function OtpVerifyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const verifyOtpFn = useServerFn(verifyOtp);
  const requestOtpFn = useServerFn(requestOtp);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtpFn({ data: { email, code } });
      if (!res.ok) {
        setError(
          res.error === "too_many_attempts"
            ? t("auth.errors.tooManyAttempts")
            : t("auth.errors.invalidCode"),
        );
        return;
      }
      // Exchange Supabase hashed token for a session
      const { error: vErr } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash: res.tokenHash,
      });
      if (vErr) {
        setError(t("common.error"));
        return;
      }
      navigate({ to: "/dashboard" });
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendCooldown > 0) return;
    setError(null);
    const res = await requestOtpFn({ data: { email } });
    if (!res.ok) {
      setError(res.error === "rate_limited" ? t("auth.errors.rateLimited") : t("common.error"));
      return;
    }
    setResendCooldown(60);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t("auth.verifyTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.verifySubtitle", { email })}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">{t("auth.codeLabel")}</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center font-mono text-2xl tracking-[0.4em]"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.verify")}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => navigate({ to: "/auth/login" })}
            className="text-muted-foreground hover:text-foreground"
          >
            {t("auth.changeEmail")}
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={resendCooldown > 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {resendCooldown > 0
              ? t("auth.resendIn", { seconds: resendCooldown })
              : t("auth.resend")}
          </button>
        </div>
      </div>
    </div>
  );
}
