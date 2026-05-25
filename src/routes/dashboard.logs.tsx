import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CyberCard, StatPill, PulseDot } from "@/components/dashboard/CyberCard";
import { Activity, Search } from "lucide-react";

export const Route = createFileRoute("/dashboard/logs")({
  head: () => ({ meta: [{ title: "Logs — DB·GUARD" }] }),
  component: Logs,
});

type L = { id: string; ts: string; action: string; target: string | null; actor_email: string | null; ip: string | null };

const MOCK: L[] = [
  { id: "1", ts: new Date(Date.now() - 60_000).toISOString(), action: "auth.login", target: "session_a3f", actor_email: "alex@acme.com", ip: "192.168.1.43" },
  { id: "2", ts: new Date(Date.now() - 240_000).toISOString(), action: "table.create", target: "tbl_orders", actor_email: "alex@acme.com", ip: "192.168.1.43" },
  { id: "3", ts: new Date(Date.now() - 600_000).toISOString(), action: "record.insert", target: "rec_8a4f", actor_email: "service:api", ip: "internal" },
  { id: "4", ts: new Date(Date.now() - 900_000).toISOString(), action: "key.rotate", target: "key_live_a3f", actor_email: "alex@acme.com", ip: "192.168.1.43" },
  { id: "5", ts: new Date(Date.now() - 1_500_000).toISOString(), action: "auth.failed", target: null, actor_email: "anon", ip: "203.0.113.7" },
];

function Logs() {
  const [logs, setLogs] = useState<L[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetch("/api/logs").then((r) => r.json()).then((j) => {
      const live = (j.ok && Array.isArray(j.logs) && j.logs.length > 0) ? j.logs as L[] : MOCK;
      setLogs(live);
    }).catch(() => setLogs(MOCK));
  }, []);

  const filtered = (logs ?? []).filter((l) =>
    !q || l.action.includes(q) || (l.actor_email ?? "").includes(q) || (l.target ?? "").includes(q)
  );

  return (
    <DashboardShell title="Audit Logs">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, actors, targets…" className="w-full ps-9 rounded-md border border-border bg-input px-3 py-2 text-sm" />
        </div>
        <StatPill tone="success"><PulseDot /> live</StatPill>
        <StatPill tone="muted">{filtered.length} events</StatPill>
      </div>

      <CyberCard>
        <div className="p-4 border-b border-primary/10 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Activity timeline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-primary/10 text-left">
              <tr className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Target</th>
                <th className="px-4 py-2.5">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs === null ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No matching events.</td></tr>
              ) : filtered.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 font-mono text-xs hover:bg-primary/5">
                  <td className="px-4 py-2 text-muted-foreground">{new Date(l.ts).toLocaleString()}</td>
                  <td className="px-4 py-2"><StatPill tone={l.action.includes("failed") ? "danger" : l.action.includes("rotate") ? "warn" : "primary"}>{l.action}</StatPill></td>
                  <td className="px-4 py-2">{l.actor_email ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.target ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CyberCard>
    </DashboardShell>
  );
}
