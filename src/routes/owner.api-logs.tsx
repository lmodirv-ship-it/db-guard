import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, RefreshCw, AlertCircle } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";

type ApiLog = {
  id: number;
  created_at: string;
  endpoint: string;
  method: string;
  status: number;
  workspace_id: string | null;
  api_key_id: string | null;
  origin: string | null;
  ip: string | null;
  duration_ms: number | null;
  error: string | null;
};

export const Route = createFileRoute("/owner/api-logs")({
  head: () => ({ meta: [{ title: "API Logs — DB·GUARD" }] }),
  component: ApiLogsPage,
});

function ApiLogsPage() {
  const [logs, setLogs] = useState<ApiLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [endpoint, setEndpoint] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "300" });
      if (onlyErrors) params.set("status", "errors");
      if (endpoint.trim()) params.set("endpoint", endpoint.trim());
      const r = await fetch(`/api/admin/api-logs?${params}`);
      const j = (await r.json()) as { ok: boolean; logs?: ApiLog[] };
      setLogs(j.ok && j.logs ? j.logs : []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [onlyErrors]);

  return (
    <div>
      <PageHeader
        title="API Logs"
        subtitle="كل طلب يصل إلى السيرفر من المواقع المتصلة — تستطيع تتبع المصدر، الزمن، الحالة، والأخطاء."
        actions={
          <button onClick={load} disabled={loading}
            className="h-10 px-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 flex items-center gap-2 text-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </button>
        }
      />

      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-3 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
            <AlertCircle className="h-4 w-4 text-destructive" /> الأخطاء فقط (4xx/5xx)
          </label>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="فلترة بالمسار، مثل: /api/public/v1/data"
            className="h-9 flex-1 min-w-[260px] rounded-lg border border-border bg-background px-3 text-sm"
          />
          <button onClick={load} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm">بحث</button>
        </div>
      </Panel>

      <Panel>
        {logs === null ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : logs.length === 0 ? (
          <EmptyState icon={Activity} title="لا توجد طلبات بعد" description="بمجرد أن يبدأ موقع باستخدام الـ API ستظهر السجلات هنا." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Endpoint</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Origin</th>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">ms</th>
                  <th className="px-3 py-2">Workspace</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.method}</td>
                    <td className="px-3 py-2 font-mono text-xs truncate max-w-[280px]" title={l.endpoint}>{l.endpoint}</td>
                    <td className={`px-3 py-2 font-mono text-xs ${l.status >= 500 ? "text-destructive" : l.status >= 400 ? "text-amber-500" : "text-emerald-500"}`}>{l.status}</td>
                    <td className="px-3 py-2 text-xs truncate max-w-[160px]" title={l.origin ?? ""}>{l.origin ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{l.ip ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{l.duration_ms ?? "—"}</td>
                    <td className="px-3 py-2 text-xs font-mono truncate max-w-[120px]" title={l.workspace_id ?? ""}>{l.workspace_id?.slice(0, 8) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
