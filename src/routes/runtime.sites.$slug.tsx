import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

type SiteResp = {
  ok: boolean;
  site?: { id: string; slug: string; site_url: string | null; status: string | null; created_at: string; updated_at: string };
  events?: Array<{ id: string; type: string; severity: string; created_at: string; payload: Record<string, unknown> }>;
  requests?: Array<{ bucket: string; value: number }>;
  errors?: Array<{ bucket: string; value: number }>;
  error?: string;
};

export const Route = createFileRoute("/runtime/sites/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Runtime` }] }),
  component: SiteRuntime,
});

function SiteRuntime() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<SiteResp | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      const r = await fetch(`/api/hn/runtime/sites/${slug}`).then((r) => r.json());
      if (alive) setData(r);
    }
    tick();
    const id = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [slug]);

  return (
    <DashboardShell title={`Runtime · ${slug}`}>
      {!data ? <p className="text-sm text-muted-foreground">Loading…</p> : !data.ok || !data.site ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm">Site not found: {slug}</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card/40 p-4 text-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div><span className="text-muted-foreground">URL:</span> <span className="font-mono">{data.site.site_url ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="font-mono">{data.site.status ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Created:</span> {new Date(data.site.created_at).toLocaleString()}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <SeriesPanel title="Requests / minute (60m)" data={data.requests ?? []} />
            <SeriesPanel title="Errors / minute (60m)" data={data.errors ?? []} accent="destructive" />
          </div>

          <div className="rounded-lg border border-border bg-card/40 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Recent Events</div>
            <div className="font-mono text-[11px] divide-y divide-border max-h-[420px] overflow-auto">
              {(data.events ?? []).length === 0 && <div className="text-muted-foreground p-2">No events for this site yet.</div>}
              {(data.events ?? []).map((e) => (
                <div key={e.id} className="grid grid-cols-[80px_60px_160px_1fr] gap-3 px-2 py-1.5">
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                  <span className={e.severity === "error" ? "text-destructive" : e.severity === "warn" ? "text-yellow-500" : "text-muted-foreground"}>{e.severity}</span>
                  <span className="text-primary">{e.type}</span>
                  <span className="text-muted-foreground truncate">{JSON.stringify(e.payload)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function SeriesPanel({ title, data, accent }: { title: string; data: Array<{ bucket: string; value: number }>; accent?: "destructive" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{title}</div>
      <div className="flex items-end gap-0.5 h-32">
        {data.length === 0 && <div className="text-xs text-muted-foreground">No samples.</div>}
        {data.map((d) => (
          <div key={d.bucket} title={`${d.bucket}: ${d.value}`}
               className={`flex-1 rounded-t ${accent === "destructive" ? "bg-destructive/60" : "bg-primary/60"}`}
               style={{ height: `${(d.value / max) * 100}%`, minHeight: 2 }} />
        ))}
      </div>
    </div>
  );
}
