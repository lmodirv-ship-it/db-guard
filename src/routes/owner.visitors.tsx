import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus, Loader2, Mail, Globe, Monitor } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/visitors")({
  head: () => ({ meta: [{ title: "Visitors — DB·GUARD" }] }),
  component: VisitorsPage,
});

type Visitor = {
  id: number;
  user_id: string | null;
  email: string;
  name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  country: string | null;
  registered_at: string;
};

function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/visitors");
      const j = (await r.json()) as { ok: boolean; visitors?: Visitor[]; total?: number };
      if (j.ok && j.visitors) {
        setVisitors(j.visitors);
        setTotal(j.total ?? j.visitors.length);
      } else {
        setVisitors([]);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="الزوار المسجلون" subtitle="سجل كامل لكل زائر سجّل حساباً في الموقع." />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard icon={UserPlus} label="إجمالي التسجيلات" value={total.toLocaleString("ar")} />
        <StatCard icon={Mail} label="آخر تسجيل" value={visitors?.[0] ? new Date(visitors[0].registered_at).toLocaleDateString("ar") : "—"} />
        <StatCard icon={Globe} label="معروض" value={(visitors?.length ?? 0).toLocaleString("ar")} />
      </div>

      <Panel title="جميع الزوار">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
          </div>
        ) : !visitors || visitors.length === 0 ? (
          <EmptyState icon={UserPlus} title="لا يوجد زوار مسجلون بعد" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">#ID</th>
                  <th className="px-3 py-2">البريد</th>
                  <th className="px-3 py-2">الاسم</th>
                  <th className="px-3 py-2"><span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> IP</span></th>
                  <th className="px-3 py-2"><span className="inline-flex items-center gap-1"><Monitor className="h-3 w-3" /> المتصفح</span></th>
                  <th className="px-3 py-2">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-3 font-mono text-xs text-primary font-semibold">#{v.id}</td>
                    <td className="px-3 py-3 font-mono text-xs">{v.email}</td>
                    <td className="px-3 py-3">{v.name ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{v.ip_address ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground max-w-[240px] truncate" title={v.user_agent ?? ""}>
                      {shortenUA(v.user_agent)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">
                      {new Date(v.registered_at).toLocaleString("ar")}
                    </td>
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

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl p-5 flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function shortenUA(ua: string | null): string {
  if (!ua) return "—";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  if (/Edg\//.test(ua)) return "Edge";
  return ua.slice(0, 30);
}
