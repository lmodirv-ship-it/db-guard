import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { listMySessions, revokeSession, revokeAllOtherSessions } from "@/lib/identity/sessions.functions";

type Session = {
  id: string;
  source_app: string | null;
  device: string | null;
  user_agent: string | null;
  ip_address: string | null;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/account/sessions")({
  head: () => ({ meta: [{ title: "Active sessions — DB-GUARD" }] }),
  component: SessionsPage,
});

function SessionsPage() {
  const listFn = useServerFn(listMySessions);
  const revokeFn = useServerFn(revokeSession);
  const revokeAllFn = useServerFn(revokeAllOtherSessions);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const r = await listFn();
      if (!r.ok) { setError(r.error === "unauthenticated" ? "Please sign in" : "Failed to load"); return; }
      setSessions(r.sessions as Session[]);
      setError(null);
    } finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  async function onRevoke(id: string) {
    await revokeFn({ data: { session_id: id } });
    await reload();
  }
  async function onRevokeAll() {
    if (!confirm("Revoke all other sessions?")) return;
    await revokeAllFn();
    await reload();
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Active sessions</h1>
            <p className="text-sm text-muted-foreground">Devices currently signed into your HN account.</p>
          </div>
          <button onClick={onRevokeAll} className="rounded-lg border border-destructive/40 text-destructive px-4 py-2 text-sm hover:bg-destructive/10">
            Revoke all other sessions
          </button>
        </header>

        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive mb-6">{error}</div>}
        {loading ? <p className="text-muted-foreground">Loading…</p> : (
          <div className="space-y-3">
            {sessions.length === 0 && <p className="text-muted-foreground">No sessions found.</p>}
            {sessions.map((s) => {
              const revoked = !!s.revoked_at;
              const expired = new Date(s.expires_at) < new Date();
              const isActive = !revoked && !expired;
              return (
                <div key={s.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${isActive ? "border-border bg-card" : "border-border/40 bg-muted/30 opacity-70"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.device || "Unknown device"}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted">{s.source_app || "dbguard"}</span>
                      {!isActive && <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive">{revoked ? "revoked" : "expired"}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">{s.user_agent || "—"}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      IP: <span className="font-mono">{s.ip_address || "—"}</span> · Last active: {new Date(s.last_active_at).toLocaleString()}
                    </div>
                  </div>
                  {isActive && (
                    <button onClick={() => onRevoke(s.id)} className="text-sm rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Revoke</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
