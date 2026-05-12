import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/settings")({
  head: () => ({ meta: [{ title: "Settings — DB·GUARD" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!j.ok) { setMsg({ kind: "err", text: j.error ?? "change_failed" }); return; }
      setMsg({ kind: "ok", text: "تم تغيير كلمة المرور بنجاح." });
      setCur(""); setNext("");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="إعدادات حسابك والمنصة." />

      <div className="max-w-xl">
        <Panel title="تغيير كلمة المرور" right={<KeyRound className="h-4 w-4 text-muted-foreground" />}>
          <form onSubmit={submit} className="space-y-3">
            <input type="password" required autoComplete="current-password"
              placeholder="كلمة المرور الحالية" value={cur} onChange={(e) => setCur(e.target.value)}
              className="w-full h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <input type="password" required minLength={8} autoComplete="new-password"
              placeholder="كلمة المرور الجديدة (8+)" value={next} onChange={(e) => setNext(e.target.value)}
              className="w-full h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={busy}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} تحديث
              </button>
              {msg && <span className={msg.kind === "ok" ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</span>}
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
