import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CyberCard, StatPill, PulseDot } from "@/components/dashboard/CyberCard";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { Gauge, Cpu, Activity, AlertTriangle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { timeSeries, queryPerf } from "@/lib/mock/enterprise";

export const Route = createFileRoute("/dashboard/monitoring")({
  head: () => ({ meta: [{ title: "Monitoring — DB·GUARD" }] }),
  component: Page,
});

function Page() {
  const [series, setSeries] = useState(timeSeries(40, 1100, 400, 5));
  const queries = queryPerf();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setSeries((s) => {
        const last = s[s.length - 1];
        const next = {
          t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          requests: Math.max(300, Math.round(last.requests + (Math.random() - 0.5) * 250)),
          errors: Math.max(0, Math.round((Math.random() - 0.7) * 20)),
          latency: Math.max(20, Math.round(last.latency + (Math.random() - 0.5) * 12)),
        };
        return [...s.slice(-39), next];
      });
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const cur = series[series.length - 1];
  const errors = series.reduce((a, b) => a + b.errors, 0);

  return (
    <DashboardShell title="Monitoring">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          { l: "Requests / min", v: cur.requests, sub: "live", icon: Activity, tone: "primary" as const },
          { l: "Latency p50", v: cur.latency, sub: "milliseconds", icon: Gauge, tone: "primary" as const },
          { l: "CPU usage", v: 42 + (tick % 11), sub: "node-01", icon: Cpu, tone: "primary" as const },
          { l: "Errors / 30m", v: errors, sub: "across all keys", icon: AlertTriangle, tone: "danger" as const },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <CyberCard key={k.l}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</span>
                  <Icon className={`h-4 w-4 ${k.tone === "danger" ? "text-destructive" : "text-primary"}`} />
                </div>
                <div className="text-3xl font-bold"><AnimatedCounter value={k.v} /></div>
                <div className="text-[11px] text-muted-foreground mt-1">{k.sub}</div>
              </div>
            </CyberCard>
          );
        })}
      </div>

      <CyberCard className="mb-6">
        <div className="p-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Request throughput & latency</h3>
            <p className="text-xs text-muted-foreground">Live — updating every 1.8s</p>
          </div>
          <div className="flex items-center gap-2"><PulseDot /> <span className="font-mono text-xs text-success">streaming</span></div>
        </div>
        <div className="p-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.04 280 / 0.2)" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: "oklch(0.7 0.02 260)" }} stroke="oklch(0.3 0.04 280 / 0.3)" />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.7 0.02 260)" }} stroke="oklch(0.3 0.04 280 / 0.3)" />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.03 270)", border: "1px solid oklch(0.7 0.2 295 / 0.3)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="requests" stroke="oklch(0.7 0.2 295)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="latency" stroke="oklch(0.7 0.2 230)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="errors" stroke="oklch(0.62 0.25 20)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CyberCard>

      <CyberCard>
        <div className="p-4 border-b border-primary/10 flex items-center justify-between">
          <h3 className="font-semibold">Slow queries (top by p95)</h3>
          <StatPill tone="warn">{queries.length} tracked</StatPill>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-primary/10 bg-card/40 text-left">
              <tr>
                <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Query</th>
                <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Calls</th>
                <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Avg</th>
                <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">p95</th>
                <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Rows</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-primary/5">
                  <td className="px-4 py-2 font-mono text-xs truncate max-w-md">{q.q}</td>
                  <td className="px-4 py-2 tabular-nums">{q.calls.toLocaleString()}</td>
                  <td className="px-4 py-2 tabular-nums text-success">{q.avg}ms</td>
                  <td className={`px-4 py-2 tabular-nums ${q.p95 > 40 ? "text-amber-400" : "text-muted-foreground"}`}>{q.p95}ms</td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{q.rows.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CyberCard>
    </DashboardShell>
  );
}
