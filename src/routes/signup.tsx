import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Create workspace — Smart Generator" }] }),
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(json.error ?? "signup_failed");
        return;
      }
      void navigate({ to: "/dashboard" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your workspace">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Workspace name (optional)" value={name} onChange={setName} />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="Password (min 8 chars)"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create workspace"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have one?{" "}
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
