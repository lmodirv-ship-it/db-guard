import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset } from "@/lib/identity/password-reset.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — DB-GUARD" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const reqFn = useServerFn(requestPasswordReset);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await reqFn({ data: { identifier } });
      if (!r.ok) { setError("Unable to send reset code"); return; }
      const params = new URLSearchParams();
      if (r.token) params.set("token", r.token);
      params.set("email", r.masked_email);
      navigate({ to: `/reset-password?${params.toString()}` as never });
    } catch {
      setError("Network error");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-[11px] tracking-[4px] text-primary">DB-GUARD · IDENTITY</div>
          <h1 className="mt-2 text-2xl font-semibold">Forgot password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your email or HN user code to receive a 6-digit reset code.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className="text-sm font-medium">Email or HN code</label>
            <input
              required
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or HN-123456"
              className="mt-1 w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={loading || identifier.trim().length < 3}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset code"}
          </button>
          <div className="text-center text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">Back to sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
