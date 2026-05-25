import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CyberCard, StatPill, PulseDot } from "@/components/dashboard/CyberCard";
import { Lock, Shield, Eye, AlertTriangle, CheckCircle2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/dashboard/security")({
  head: () => ({ meta: [{ title: "Security — DB·GUARD" }] }),
  component: Page,
});

const checks = [
  { l: "Row Level Security enabled on all tables", ok: true },
  { l: "API keys rotated within 90 days", ok: true },
  { l: "Two-factor authentication active", ok: false },
  { l: "Audit log retention: 90 days", ok: true },
  { l: "TLS 1.3 enforced on all endpoints", ok: true },
  { l: "Webhook signature verification", ok: true },
];

const audit = [
  { who: "alex@acme.com", what: "logged in", from: "192.168.1.43", at: "2m ago", level: "info" },
  { who: "service:api", what: "rotated key key_live_a3f", from: "internal", at: "21m ago", level: "info" },
  { who: "ops@acme.com", what: "updated RLS policy on `orders`", from: "10.0.0.7", at: "1h ago", level: "warn" },
  { who: "anon", what: "401 — invalid bearer", from: "203.0.113.7", at: "1h ago", level: "alert" },
  { who: "alex@acme.com", what: "exported records (4,810)", from: "192.168.1.43", at: "3h ago", level: "info" },
];

function Page() {
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return (
    <DashboardShell title="Security">
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <CyberCard glow className="lg:col-span-1">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Security score</span>
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="text-5xl font-bold tabular-nums">{score}<span className="text-2xl text-muted-foreground">/100</span></div>
            <div className="h-1.5 bg-muted rounded-full mt-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-success via-primary to-accent" style={{ width: `${score}%` }} /></div>
            <div className="mt-3 flex items-center gap-2 text-xs"><PulseDot /> <span className="text-muted-foreground">Continuous scanning</span></div>
          </div>
        </CyberCard>

        <CyberCard className="lg:col-span-2">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Compliance checks</h3>
            <StatPill tone="success">{checks.filter((c) => c.ok).length}/{checks.length} passed</StatPill>
          </div>
          <div className="p-2">
            {checks.map((c) => (
              <div key={c.l} className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0">
                {c.ok ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
                <span className="text-sm flex-1">{c.l}</span>
                <StatPill tone={c.ok ? "success" : "warn"}>{c.ok ? "pass" : "action needed"}</StatPill>
              </div>
            ))}
          </div>
        </CyberCard>
      </div>

      <CyberCard>
        <div className="p-4 border-b border-primary/10 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Audit log</h3>
          <div className="flex items-center gap-2">
            <StatPill tone="muted">last 24h</StatPill>
            <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted inline-flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Export</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-primary/10 text-left">
              <tr className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Source IP</th>
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Level</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-primary/5">
                  <td className="px-4 py-2.5 font-mono text-xs">{a.who}</td>
                  <td className="px-4 py-2.5">{a.what}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.from}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.at}</td>
                  <td className="px-4 py-2.5">
                    <StatPill tone={a.level === "alert" ? "danger" : a.level === "warn" ? "warn" : "primary"}>{a.level}</StatPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CyberCard>
    </DashboardShell>
  );
}
