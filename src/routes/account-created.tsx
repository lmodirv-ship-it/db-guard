import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Copy, CheckCircle2, ShieldCheck, ArrowRight, KeyRound, Database, Layers, User, AlertTriangle } from "lucide-react";

const searchSchema = z.object({
  hn_user_code: z.string().optional(),
  user_id: z.string().optional(),
  workspace_id: z.string().optional(),
  database_id: z.string().optional(),
  api_key: z.string().optional(),
  redirect_url: z.string().optional(),
  source_app: z.string().optional(),
});

export const Route = createFileRoute("/account-created")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Account Created — HN Account" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountCreatedPage,
});

type Stash = {
  hn_user_code: string;
  user_id: string;
  workspace_id: string;
  database_id: string;
  api_key?: string;
  full_name?: string;
  email?: string;
};

function AccountCreatedPage() {
  const search = useSearch({ from: "/account-created" });
  const navigate = useNavigate();
  const [data, setData] = useState<Stash | null>(null);

  useEffect(() => {
    // Prefer sessionStorage (no api_key in URL)
    let stash: Stash | null = null;
    try {
      const raw = sessionStorage.getItem("hn_account_created");
      if (raw) stash = JSON.parse(raw) as Stash;
    } catch { /* ignore */ }
    if (!stash && search.hn_user_code && search.user_id) {
      stash = {
        hn_user_code: search.hn_user_code,
        user_id: search.user_id,
        workspace_id: search.workspace_id ?? "",
        database_id: search.database_id ?? "",
        api_key: search.api_key,
      };
    }
    if (!stash) {
      void navigate({ to: "/register" });
      return;
    }
    setData(stash);
  }, [navigate, search]);

  if (!data) return null;

  return (
    <div
      className="relative min-h-screen overflow-hidden text-foreground"
      style={{
        background:
          "radial-gradient(ellipse at 30% 0%, oklch(0.22 0.06 80 / 0.4), transparent 55%), radial-gradient(ellipse at 80% 100%, oklch(0.18 0.08 280 / 0.5), transparent 60%), oklch(0.07 0.02 270)",
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.85 0.18 90 / 0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.18 90 / 0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
        }} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "oklch(0.72 0.2 155 / 0.15)", boxShadow: "0 0 60px oklch(0.72 0.2 155 / 0.55)" }}>
            <CheckCircle2 className="h-10 w-10" style={{ color: "oklch(0.78 0.2 155)" }} />
          </div>
          <h1 className="mt-6 font-brand text-4xl font-black tracking-tight"
            style={{ color: "oklch(0.92 0.18 90)" }}>
            Account Created Successfully
          </h1>
          <p className="mt-3 text-muted-foreground">
            Your HN identity, workspace, primary database and API key are live.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          <CopyRow icon={<ShieldCheck className="h-4 w-4" />} label="HN Code" value={data.hn_user_code} highlight />
          <CopyRow icon={<User className="h-4 w-4" />} label="User ID" value={data.user_id} mono />
          <CopyRow icon={<Layers className="h-4 w-4" />} label="Workspace ID" value={data.workspace_id} mono />
          <CopyRow icon={<Database className="h-4 w-4" />} label="Database ID" value={data.database_id} mono />
          {data.api_key ? (
            <CopyRow icon={<KeyRound className="h-4 w-4" />} label="API Key (shown once)" value={data.api_key} mono secret />
          ) : null}
        </div>

        {data.api_key ? (
          <div
            className="mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm"
            style={{ borderColor: "oklch(0.78 0.18 60 / 0.45)", background: "oklch(0.78 0.18 60 / 0.06)" }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "oklch(0.85 0.18 75)" }} />
            <div className="text-muted-foreground">
              This API key will <span className="font-semibold text-foreground">never be shown again</span>. Copy and store it securely now.
            </div>
          </div>
        ) : null}

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            onClick={() => sessionStorage.removeItem("hn_account_created")}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold transition"
            style={{
              background: "linear-gradient(135deg, oklch(0.92 0.18 90), oklch(0.7 0.22 55))",
              color: "oklch(0.13 0.02 270)",
              boxShadow: "0 14px 36px -10px oklch(0.85 0.18 85 / 0.7)",
            }}
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

function CopyRow({
  icon, label, value, mono, highlight, secret,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  const display = secret && !revealed ? "•".repeat(Math.min(32, value.length)) : value;
  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-4 backdrop-blur"
      style={{
        borderColor: highlight ? "oklch(0.85 0.18 85 / 0.5)" : "oklch(0.85 0.18 85 / 0.18)",
        background: highlight ? "oklch(0.85 0.18 85 / 0.06)" : "oklch(0.12 0.03 270 / 0.6)",
      }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ color: "oklch(0.85 0.18 85)", background: "oklch(0.85 0.18 85 / 0.1)" }}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`truncate text-sm ${mono ? "font-mono" : ""} ${highlight ? "text-lg font-bold" : ""}`}
          style={highlight ? { color: "oklch(0.92 0.18 90)" } : undefined}>
          {display}
        </div>
      </div>
      {secret ? (
        <button onClick={() => setRevealed((v) => !v)}
          className="rounded-md border px-2 py-1 text-[11px] uppercase tracking-wider"
          style={{ borderColor: "oklch(0.85 0.18 85 / 0.4)", color: "oklch(0.85 0.18 85)" }}>
          {revealed ? "Hide" : "Reveal"}
        </button>
      ) : null}
      <button onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: "oklch(0.85 0.18 85 / 0.5)", color: "oklch(0.85 0.18 85)" }}>
        {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
