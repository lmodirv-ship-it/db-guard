import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CyberCard, StatPill } from "@/components/dashboard/CyberCard";
import { FileText, Search, Filter, Download } from "lucide-react";

export const Route = createFileRoute("/dashboard/records")({
  head: () => ({ meta: [{ title: "Records — DB·GUARD" }] }),
  component: Page,
});

type T = { id: string; name: string; record_count: number; column_count: number };

const MOCK_RECENT = [
  { id: "rec_8a4f", table: "users", op: "insert", at: "2m ago", excerpt: '{ email: "alex@acme.com", role: "admin" }' },
  { id: "rec_31bc", table: "orders", op: "update", at: "4m ago", excerpt: '{ status: "shipped", carrier: "DHL" }' },
  { id: "rec_91d2", table: "events", op: "insert", at: "6m ago", excerpt: '{ type: "page_view", path: "/pricing" }' },
  { id: "rec_2e80", table: "sessions", op: "delete", at: "10m ago", excerpt: '{ id: "sess_91…" }' },
  { id: "rec_44a9", table: "users", op: "update", at: "12m ago", excerpt: '{ last_seen: "2026-05-25T10:24Z" }' },
];

function Page() {
  const [tables, setTables] = useState<T[]>([]);
  useEffect(() => {
    fetch("/api/tables").then((r) => r.json()).then((j) => j.ok && setTables(j.tables));
  }, []);

  return (
    <DashboardShell title="Records Explorer">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search across all records…" className="w-full ps-9 rounded-md border border-border bg-input px-3 py-2 text-sm" />
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"><Filter className="h-4 w-4" /> Filters</button>
        <button className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"><Download className="h-4 w-4" /> Export</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <CyberCard className="lg:col-span-2">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Tables</h3>
            <StatPill tone="primary">{tables.length}</StatPill>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-primary/10 text-left">
                <tr className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5">Table</th>
                  <th className="px-4 py-2.5">Records</th>
                  <th className="px-4 py-2.5">Columns</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tables.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">
                    No tables yet. <Link to="/dashboard/tables" className="text-primary hover:underline">Create one →</Link>
                  </td></tr>
                ) : tables.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-primary/5">
                    <td className="px-4 py-2.5 font-mono text-xs">{t.name}</td>
                    <td className="px-4 py-2.5 tabular-nums">{t.record_count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.column_count}</td>
                    <td className="px-4 py-2.5 text-end">
                      <Link to="/dashboard/tables/$id" params={{ id: t.id }} className="text-primary text-xs hover:underline">Open →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CyberCard>

        <CyberCard>
          <div className="p-4 border-b border-primary/10">
            <h3 className="font-semibold">Recent record activity</h3>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {MOCK_RECENT.map((r) => (
              <div key={r.id} className="px-3 py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatPill tone={r.op === "insert" ? "success" : r.op === "delete" ? "danger" : "primary"}>{r.op}</StatPill>
                  <span className="font-mono text-xs">{r.table}</span>
                  <span className="ms-auto text-[10px] text-muted-foreground">{r.at}</span>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">{r.excerpt}</div>
              </div>
            ))}
          </div>
        </CyberCard>
      </div>
    </DashboardShell>
  );
}
