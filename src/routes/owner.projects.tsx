import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";
import {
  listOwnerWorkspaces,
  listOwnerSites,
  ownerAddSite,
  ownerDeleteSite,
  ownerToggleSiteFeature,
} from "@/lib/platform/owner.functions";
import { FolderKanban, Plus, Trash2, ExternalLink, ShieldCheck, Loader2, Database, HardDrive, KeyRound } from "lucide-react";
import { toast } from "sonner";

type Site = {
  id: string;
  name: string;
  site_url: string;
  site_host: string;
  workspace_id: string;
  status: string;
  auth_enabled: boolean;
  storage_enabled: boolean;
  data_enabled: boolean;
  verified_at: string | null;
  created_at: string;
};

type Workspace = {
  id: string;
  name: string;
  hn_users: { email: string; full_name: string }[] | { email: string; full_name: string } | null;
};

export const Route = createFileRoute("/owner/projects")({
  head: () => ({ meta: [{ title: "Projects — DB·GUARD" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const qc = useQueryClient();
  const fetchSites = useServerFn(listOwnerSites);
  const fetchWs = useServerFn(listOwnerWorkspaces);
  const addSite = useServerFn(ownerAddSite);
  const delSite = useServerFn(ownerDeleteSite);
  const toggle = useServerFn(ownerToggleSiteFeature);

  const sitesQ = useQuery({ queryKey: ["owner", "sites"], queryFn: () => fetchSites() });
  const wsQ = useQuery({ queryKey: ["owner", "workspaces"], queryFn: () => fetchWs() });

  const sites = (sitesQ.data?.sites ?? []) as Site[];
  const workspaces = (wsQ.data?.workspaces ?? []) as Workspace[];

  const wsById = useMemo(() => {
    const m = new Map<string, Workspace>();
    for (const w of workspaces) m.set(w.id, w);
    return m;
  }, [workspaces]);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [wsId, setWsId] = useState("");

  const create = useMutation({
    mutationFn: () => addSite({ data: { workspaceId: wsId, name, siteUrl: url } }),
    onSuccess: () => {
      toast.success("تمت إضافة المشروع");
      setName(""); setUrl("");
      qc.invalidateQueries({ queryKey: ["owner", "sites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (siteId: string) => delSite({ data: { siteId } }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["owner", "sites"] });
    },
  });

  const flip = useMutation({
    mutationFn: (v: { siteId: string; feature: "auth" | "storage" | "data"; enabled: boolean }) =>
      toggle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner", "sites"] }),
  });

  // Default workspace once loaded
  if (!wsId && workspaces[0]) setWsId(workspaces[0].id);

  return (
    <div>
      <PageHeader title="Projects" subtitle="أضف، عدّل واحذف مواقعك دون الخروج من لوحة المالك." />

      <Panel title="إضافة مشروع جديد" className="mb-6">
        <form
          onSubmit={(e) => { e.preventDefault(); if (wsId && name && url) create.mutate(); }}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <select
            value={wsId}
            onChange={(e) => setWsId(e.target.value)}
            className="h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {workspaces.length === 0 && <option value="">لا يوجد مساحات عمل</option>}
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="اسم المشروع"
            className="h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-10 rounded-xl bg-muted/40 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
          />
          <button
            type="submit" disabled={create.isPending || !wsId || !name || !url}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة
          </button>
        </form>
      </Panel>

      <Panel title={`جميع المشاريع (${sites.length})`}>
        {sitesQ.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
        ) : sites.length === 0 ? (
          <EmptyState icon={FolderKanban} title="لا توجد مشاريع بعد" description="أضف أول مشروع من الأعلى." />
        ) : (
          <div className="space-y-3">
            {sites.map((s) => {
              const ws = wsById.get(s.workspace_id);
              return (
                <div key={s.id} className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Link
                      to="/owner/projects/$siteId"
                      params={{ siteId: s.id }}
                      className="min-w-0 flex-1 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold group-hover:text-primary transition">{s.name}</span>
                        {s.verified_at && (
                          <span className="inline-flex items-center gap-1 text-[10px] rounded-full bg-emerald-500/10 text-emerald-500 px-2 py-0.5">
                            <ShieldCheck className="h-3 w-3" /> verified
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1 mt-0.5 truncate">
                        <ExternalLink className="h-3 w-3" /> {s.site_url}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {ws?.name ?? "—"} · اضغط للإدارة والربط
                      </div>
                    </Link>
                    <button
                      onClick={() => { if (confirm(`حذف ${s.name}؟`)) remove.mutate(s.id); }}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                    <button
                      onClick={() => { if (confirm(`حذف ${s.name}؟`)) remove.mutate(s.id); }}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <FeatureToggle
                      icon={Database} label="Data" enabled={s.data_enabled}
                      onChange={(v) => flip.mutate({ siteId: s.id, feature: "data", enabled: v })}
                    />
                    <FeatureToggle
                      icon={HardDrive} label="Storage" enabled={s.storage_enabled}
                      onChange={(v) => flip.mutate({ siteId: s.id, feature: "storage", enabled: v })}
                    />
                    <FeatureToggle
                      icon={KeyRound} label="Auth" enabled={s.auth_enabled}
                      onChange={(v) => flip.mutate({ siteId: s.id, feature: "auth", enabled: v })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function FeatureToggle({
  icon: Icon, label, enabled, onChange,
}: { icon: React.ComponentType<{ className?: string }>; label: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition ${
        enabled
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-primary" : "bg-muted-foreground/40"}`} />
    </button>
  );
}
