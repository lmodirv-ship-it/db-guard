import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText, RefreshCw } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";

type AuditLog = {
  id: string;
  ts: string;
  action: string;
  target: string | null;
  actor_email: string | null;
  ip: string | null;
};

const ACTION_LABEL: Record<string, string> = {
  "auth.password_changed": "تغيير كلمة المرور",
  "user.created": "إنشاء مستخدم",
  "user.deleted": "حذف مستخدم",
  "db.status_checked": "فحص اتصال قاعدة البيانات",
};

export const Route = createFileRoute("/owner/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — DB·GUARD" }] }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/audit-logs?limit=200");
      const j = (await r.json()) as { ok: boolean; logs?: AuditLog[] };
      if (j.ok && j.logs) setLogs(j.logs);
      else setLogs([]);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="سجل كامل لكل العمليات الحسّاسة في المنصة."
        actions={
          <button onClick={load} disabled={loading}
            className="h-10 px-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 flex items-center gap-2 text-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </button>
        } />

      <Panel>
        {logs === null ? (
          <p className="text-sm text-muted-foreground py-6">Loading…</p>
        ) : logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="لا توجد سجلات بعد" description="ستظهر العمليات هنا فور حدوثها." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Time</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">IP</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.ts).toLocaleString()}</td>
                  <td className="px-3 py-2"><span className="rounded-md bg-primary/15 text-primary px-2 py-0.5 text-xs font-mono">{ACTION_LABEL[l.action] ?? l.action}</span></td>
                  <td className="px-3 py-2 font-mono text-xs">{l.actor_email ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{l.target ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{l.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
