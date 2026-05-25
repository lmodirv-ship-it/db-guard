import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  FileText,
  Activity,
  Settings as SettingsIcon,
  Upload,
  User,
  Folder,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Link as LinkIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyOverview,
  createMyRecord,
  deleteMyRecord,
  saveDbguardConnection,
  disconnectDbguard,
  runDbguardExport,
} from "@/lib/my-dashboard/dashboard.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/my-dashboard")({
  head: () => ({ meta: [{ title: "My Workspace — DB·GUARD" }] }),
  component: MyDashboardPage,
});

function MyDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/auth/login" });
      } else {
        setUserEmail(data.session.user.email ?? null);
        setAuthChecked(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("myDashboard.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("myDashboard.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && <Badge variant="secondary" className="hidden sm:inline-flex">{userEmail}</Badge>}
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">DB·GUARD</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <DashboardTabs />
      </main>
    </div>
  );
}

function DashboardTabs() {
  const { t } = useTranslation();
  const getOverview = useServerFn(getMyOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["my-dashboard"],
    queryFn: () => getOverview(),
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="flex w-full flex-wrap gap-1 sm:w-auto">
        <TabsTrigger value="overview"><Database className="mr-2 h-4 w-4" />{t("myDashboard.tabs.overview")}</TabsTrigger>
        <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />{t("myDashboard.tabs.profile")}</TabsTrigger>
        <TabsTrigger value="records"><FileText className="mr-2 h-4 w-4" />{t("myDashboard.tabs.records")}</TabsTrigger>
        <TabsTrigger value="files"><Folder className="mr-2 h-4 w-4" />{t("myDashboard.tabs.files")}</TabsTrigger>
        <TabsTrigger value="logs"><Activity className="mr-2 h-4 w-4" />{t("myDashboard.tabs.logs")}</TabsTrigger>
        <TabsTrigger value="settings"><SettingsIcon className="mr-2 h-4 w-4" />{t("myDashboard.tabs.settings")}</TabsTrigger>
        <TabsTrigger value="export"><Upload className="mr-2 h-4 w-4" />{t("myDashboard.tabs.export")}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview"><Overview data={data} /></TabsContent>
      <TabsContent value="profile"><Profile data={data} /></TabsContent>
      <TabsContent value="records"><Records records={data.records} /></TabsContent>
      <TabsContent value="files"><Files files={data.files} /></TabsContent>
      <TabsContent value="logs"><Logs logs={data.logs} /></TabsContent>
      <TabsContent value="settings"><ConnectionSettings connection={data.connection} /></TabsContent>
      <TabsContent value="export"><ExportPanel data={data} /></TabsContent>
    </Tabs>
  );
}

type OverviewData = Awaited<ReturnType<typeof getMyOverview>>;

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-lg bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Overview({ data }: { data: OverviewData }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label={t("myDashboard.stats.records")} value={data.records.length} icon={FileText} />
      <Stat label={t("myDashboard.stats.files")} value={data.files.length} icon={Folder} />
      <Stat label={t("myDashboard.stats.logs")} value={data.logs.length} icon={Activity} />
      <Stat label={t("myDashboard.stats.exports")} value={data.exports.length} icon={Upload} />
    </div>
  );
}

function Profile({ data }: { data: OverviewData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span className="text-muted-foreground">User ID</span>
          <span className="font-mono text-xs">{data.userId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Connection</span>
          <ConnectionBadge status={data.connection?.status ?? "disconnected"} />
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectionBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "connected")
    return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"><CheckCircle2 className="mr-1 h-3 w-3" />{t("myDashboard.settings.connected")}</Badge>;
  if (status === "failed")
    return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />{t("myDashboard.settings.failed")}</Badge>;
  return <Badge variant="secondary">{t("myDashboard.settings.disconnected")}</Badge>;
}

function Records({ records }: { records: OverviewData["records"] }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const createFn = useServerFn(createMyRecord);
  const deleteFn = useServerFn(deleteMyRecord);
  const [type, setType] = useState("record");
  const [title, setTitle] = useState("");
  const [dataText, setDataText] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(dataText || "{}"); } catch { throw new Error("Invalid JSON"); }
      return createFn({ data: { type, title, data: parsed } });
    },
    onSuccess: () => {
      setTitle(""); setDataText("{}"); setError(null);
      qc.invalidateQueries({ queryKey: ["my-dashboard"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-dashboard"] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t("myDashboard.records.addTitle")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>{t("myDashboard.records.type")}</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("myDashboard.records.name")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Label>{t("myDashboard.records.data")}</Label>
            <Input value={dataText} onChange={(e) => setDataText(e.target.value)} className="font-mono" />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={() => create.mutate()} disabled={!title || create.isPending} className="ml-auto">
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {t("myDashboard.records.add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("myDashboard.records.title")}</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("myDashboard.records.empty")}</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {records.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.type} · {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)} disabled={remove.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Files({ files }: { files: OverviewData["files"] }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader><CardTitle>{t("myDashboard.files.title")}</CardTitle></CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("myDashboard.files.empty")}</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.mime_type ?? "—"} · {(f.size_bytes / 1024).toFixed(1)} KB</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Logs({ logs }: { logs: OverviewData["logs"] }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader><CardTitle>{t("myDashboard.logs.title")}</CardTitle></CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("myDashboard.logs.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 rounded-md border border-border/40 bg-card/30 p-3">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{l.action}</p>
                  <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectionSettings({ connection }: { connection: OverviewData["connection"] }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const saveFn = useServerFn(saveDbguardConnection);
  const disconnectFn = useServerFn(disconnectDbguard);
  const [projectId, setProjectId] = useState(connection?.project_id ?? "");
  const [targetCode, setTargetCode] = useState(connection?.endpoint_url ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { project_id: projectId, target_hn_code: targetCode } }),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ["my-dashboard"] }); },
    onError: (e) => setError(e instanceof Error ? e.message : "Error"),
  });
  const disc = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-dashboard"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> {t("myDashboard.settings.title")}</CardTitle>
        <CardDescription>
          <ConnectionBadge status={connection?.status ?? "disconnected"} />
          {connection?.last_synced_at && (
            <span className="ml-2 text-xs text-muted-foreground">
              · {t("myDashboard.settings.lastSync")}: {new Date(connection.last_synced_at).toLocaleString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>{t("myDashboard.settings.channelName")}</Label>
          <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="primary" />
        </div>
        <div>
          <Label>{t("myDashboard.settings.targetHnCode")}</Label>
          <Input value={targetCode} onChange={(e) => setTargetCode(e.target.value)} placeholder="HN-000000" />
          <p className="mt-1 text-xs text-muted-foreground">{t("myDashboard.settings.targetHnCodeHint")}</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} disabled={!projectId || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("myDashboard.settings.save")}
          </Button>
          {connection?.status === "connected" && (
            <Button variant="outline" onClick={() => disc.mutate()} disabled={disc.isPending}>
              {t("myDashboard.settings.disconnect")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


function ExportPanel({ data }: { data: OverviewData }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const runFn = useServerFn(runDbguardExport);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runDbguardExport>> | null>(null);

  const run = useMutation({
    mutationFn: () => runFn({ data: { confirm: true } }),
    onSuccess: (r) => { setResult(r); qc.invalidateQueries({ queryKey: ["my-dashboard"] }); },
  });

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dbguard-export-${result.payload.export_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> {t("myDashboard.export.title")}</CardTitle>
          <CardDescription>{t("myDashboard.export.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
            {t("myDashboard.export.includes")}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            {t("myDashboard.export.confirm")}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run.mutate()} disabled={!confirmed || run.isPending} size="lg">
              {run.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {run.isPending ? t("myDashboard.export.running") : t("myDashboard.export.run")}
            </Button>
            {result && (
              <Button variant="outline" onClick={downloadJson}>
                <Download className="mr-2 h-4 w-4" />
                {t("myDashboard.export.download")}
              </Button>
            )}
          </div>
          {result && (
            <div className={`rounded-md border p-3 text-sm ${result.status === "completed" ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
              <p className="font-medium">
                {result.status === "completed" ? t("myDashboard.export.success") : t("myDashboard.export.failed")}
              </p>
              <p className="text-xs text-muted-foreground">
                {result.items_count} items · {(result.payload_size / 1024).toFixed(1)} KB
                {result.error ? ` · ${result.error}` : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("myDashboard.export.history")}</CardTitle></CardHeader>
        <CardContent>
          {data.exports.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("myDashboard.logs.empty")}</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {data.exports.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{e.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.items_count} items · {(e.payload_size / 1024).toFixed(1)} KB · {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                  {e.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
