import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — db-guard" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, string> = { email, password };
      const displayName = name.trim() || tenantName.trim();
      if (displayName) payload.name = displayName;
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "signup_failed");
        return;
      }
      // Hard navigation so the freshly-set session cookie is attached
      // to the very next request to /api/auth/me on the dashboard.
      window.location.href = "/dashboard";
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your tenant" subtitle="One workspace per company. Isolated by default.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Workspace / company name">
          <input
            required
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-2"
          />
        </Field>
        <Field label="Your name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-2"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-2"
          />
        </Field>
        <Field label="Password (min 10 chars)">
          <input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-2"
          />
        </Field>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Already have one?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
