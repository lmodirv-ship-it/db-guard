import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/logs")({
  head: () => ({ meta: [{ title: "Logs — DB·GUARD" }] }),
  component: Logs,
});

type L = { id: string; ts: string; action: string; target: string | null; actor_email: string | null; ip: string | null };

function Logs() {
  const [logs, setLogs] = useState<L[]>([]);
  useEffect(() => {
    fetch("/api/logs").then((r) => r.json()).then((j) => j.ok && setLogs(j.logs));
  }, []);
  return (
    <DashboardShell title="Audit Logs">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">IP</th></tr>
          </thead>
          <tbody>
            {logs.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No activity yet.</td></tr> :
              logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 font-mono text-xs">
                  <td className="px-4 py-2 text-muted-foreground">{new Date(l.ts).toLocaleString()}</td>
                  <td className="px-4 py-2"><span className="rounded bg-primary/10 px-2 py-0.5 text-primary">{l.action}</span></td>
                  <td className="px-4 py-2">{l.actor_email ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.target?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.ip ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
