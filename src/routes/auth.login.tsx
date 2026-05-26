import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { requestOtp } from "@/lib/auth/otp.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — DB-GUARD" }] }),
  component: OtpLoginPage,
});

function OtpLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const requestOtpFn = useServerFn(requestOtp);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await requestOtpFn({ data: { email } });
      if (!res.ok) {
        setError(
          res.error === "rate_limited"
            ? t("auth.errors.rateLimited")
            : t("common.error"),
        );
        return;
      }
      navigate({ to: "/auth/verify", search: { email } });
    } catch {
      setError(t("auth.errors.invalidEmail"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4 flex gap-2 rtl:left-4 rtl:right-auto">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t("auth.loginTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.sendCode")}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/login" className="underline hover:text-foreground">
            Use password instead
          </Link>
        </p>
      </div>
    </div>
  );
}
