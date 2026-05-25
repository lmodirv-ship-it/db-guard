import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { completePasswordReset } from "@/lib/identity/password-reset.functions";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — DB-GUARD" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
    email: typeof s.email === "string" ? s.email : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, email } = Route.useSearch();
  const navigate = useNavigate();
  const completeFn = useServerFn(completePasswordReset);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) { setErr("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setErr("Passwords do not match"); return; }
    setBusy(true);
    try {
      const r = await completeFn({ data: { token, code, new_password: password } });
      if (!r.ok) {
        setErr(r.error === "invalid_code" ? "Invalid or expired code" : r.error === "too_many_attempts" ? "Too many attempts" : "Reset failed");
        return;
      }
      navigate({ to: "/login" });
    } catch { setErr("Network error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card/80 backdrop-blur p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-1">Reset password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the 6-digit code we sent to <span className="font-mono">{email || "your email"}</span>.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            inputMode="numeric"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center font-mono tracking-[0.5em] text-lg"
            required
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 8)"
            className="w-full rounded-lg border border-border bg-background px-4 py-3"
            required minLength={8}
          />
          <input
            type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-border bg-background px-4 py-3"
            required
          />
          {err && <div className="text-sm text-destructive">{err}</div>}
          <button type="submit" disabled={busy || code.length !== 6}
            className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50">
            {busy ? "Resetting…" : "Reset password"}
          </button>
        </form>
        <div className="mt-6 text-sm text-muted-foreground flex justify-between">
          <Link to="/forgot-password" className="hover:underline">Resend code</Link>
          <Link to="/login" className="hover:underline">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
