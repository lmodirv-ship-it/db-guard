import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — DB-GUARD" }] }),
  component: LoginPage,
});

const ERROR_MESSAGES: Record<string, string> = {
  user_not_found: "User not found. Check your email or HN ID.",
  wrong_password: "Wrong password. Try again or reset it.",
  invalid_input: "Please enter a valid email/HN ID and password.",
  account_disabled: "Your account is disabled. Contact support.",
  session_expired: "Your session expired. Please sign in again.",
  login_failed: "Login failed. Please try again.",
  network_error: "Network error. Check your connection.",
};

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log("[login-ui] submit", { identifier, remember });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: identifier.trim(), password, remember }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      console.log("[login-ui] response", { status: res.status, body: json });
      if (!res.ok || !json.ok) {
        setError(ERROR_MESSAGES[json.error ?? "login_failed"] ?? json.error ?? "Login failed");
        return;
      }
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("[login-ui] network_error", err);
      setError(ERROR_MESSAGES.network_error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
      <div className="pointer-events-none absolute inset-0 cyber-grid" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 flex justify-center">
          <Logo animated />
        </div>
        <div className="rounded-2xl glass p-8 shadow-[var(--shadow-glow)]">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Sign in with your email or HN ID.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Email or HN ID</span>
              <input
                type="text"
                required
                autoFocus
                autoComplete="username"
                placeholder="you@example.com or HN-123456"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-sm font-medium">
                <span>Password</span>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-normal">
                  Forgot password?
                </Link>
              </span>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span>Remember me for 30 days</span>
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <Link to="/register" className="text-primary hover:underline">
                Create account
              </Link>
              <Link to="/account-recovery" className="hover:text-foreground">
                Account recovery
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
