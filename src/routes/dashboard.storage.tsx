import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CyberCard, StatPill } from "@/components/dashboard/CyberCard";
import { HardDrive, FileText, Image, Film, Upload } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/dashboard/storage")({
  head: () => ({ meta: [{ title: "Storage — DB·GUARD" }] }),
  component: Page,
});

const buckets = [
  { name: "avatars", files: 1284, size: 412, public: true },
  { name: "documents", files: 5621, size: 2840, public: false },
  { name: "exports", files: 88, size: 1280, public: false },
  { name: "media", files: 412, size: 6800, public: true },
];

const breakdown = [
  { name: "Images", value: 38, fill: "oklch(0.7 0.2 295)" },
  { name: "Documents", value: 24, fill: "oklch(0.7 0.2 230)" },
  { name: "Video", value: 21, fill: "oklch(0.72 0.2 155)" },
  { name: "Other", value: 17, fill: "oklch(0.6 0.15 60)" },
];

function Page() {
  const totalGB = buckets.reduce((a, b) => a + b.size, 0) / 1024;
  return (
    <DashboardShell title="Storage">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <CyberCard glow>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Total used</span>
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold tabular-nums">{totalGB.toFixed(2)} <span className="text-base text-muted-foreground">GB</span></div>
            <div className="text-[11px] text-muted-foreground mt-1">of 100 GB plan limit</div>
            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${totalGB}%` }} /></div>
          </div>
        </CyberCard>
        {[
          { l: "Files", v: buckets.reduce((a, b) => a + b.files, 0).toLocaleString(), i: FileText },
          { l: "Images", v: "1,284", i: Image },
          { l: "Media", v: "412", i: Film },
        ].map((k) => {
          const Icon = k.i;
          return (
            <CyberCard key={k.l}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">{k.l}</span>
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div className="text-3xl font-bold tabular-nums">{k.v}</div>
              </div>
            </CyberCard>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <CyberCard className="lg:col-span-2">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h3 className="font-semibold">Buckets</h3>
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground inline-flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> New bucket</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-primary/10 text-left">
                <tr className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5">Bucket</th>
                  <th className="px-4 py-2.5">Files</th>
                  <th className="px-4 py-2.5">Size</th>
                  <th className="px-4 py-2.5">Visibility</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.name} className="border-b border-border last:border-0 hover:bg-primary/5">
                    <td className="px-4 py-3 font-mono text-sm">{b.name}</td>
                    <td className="px-4 py-3 tabular-nums">{b.files.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">{(b.size / 1024).toFixed(2)} GB</td>
                    <td className="px-4 py-3"><StatPill tone={b.public ? "primary" : "muted"}>{b.public ? "public" : "private"}</StatPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CyberCard>

        <CyberCard>
          <div className="p-4 border-b border-primary/10">
            <h3 className="font-semibold">Storage breakdown</h3>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={0}>
                  {breakdown.map((b, i) => <Cell key={i} fill={b.fill} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CyberCard>
      </div>
    </DashboardShell>
  );
}
