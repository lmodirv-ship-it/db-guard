import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Copy, KeyRound, AlertTriangle, Plus, Database, Globe, HardDrive, ShieldCheck } from "lucide-react";
import {
  listWorkspaces,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  listDataRecords,
  listCollections,
} from "@/lib/platform/dashboard.functions";
import {
  listSites,
  registerSite,
  enableSiteAuth,
  enableSiteStorage,
  listStorageObjects,
} from "@/lib/platform/sites.functions";

export const Route = createFileRoute("/dashboard/hn-data")({
  head: () => ({ meta: [{ title: "HN Data Platform — DB·GUARD" }] }),
  component: HnDataPage,
});

function HnDataPage() {
  const qc = useQueryClient();
  const wsFn = useServerFn(listWorkspaces);
  const keysFn = useServerFn(listApiKeys);
  const colsFn = useServerFn(listCollections);
  const recsFn = useServerFn(listDataRecords);
  const createKeyFn = useServerFn(createApiKey);
  const revokeFn = useServerFn(revokeApiKey);
  const sitesFn = useServerFn(listSites);
  const registerSiteFn = useServerFn(registerSite);
  const enableAuthFn = useServerFn(enableSiteAuth);
  const enableStorageFn = useServerFn(enableSiteStorage);
  const storageFn = useServerFn(listStorageObjects);

  const wsQ = useQuery({ queryKey: ["hn", "workspaces"], queryFn: () => wsFn() });
  const keysQ = useQuery({ queryKey: ["hn", "keys"], queryFn: () => keysFn() });

  const [wsId, setWsId] = useState<string>("");
  const [collection, setCollection] = useState<string>("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyLabel, setKeyLabel] = useState("default");
  const [siteUrl, setSiteUrl] = useState("https://");

  useEffect(() => {
    if (!wsId && wsQ.data?.workspaces?.[0]) setWsId(wsQ.data.workspaces[0].id);
  }, [wsQ.data, wsId]);

  const colsQ = useQuery({
    queryKey: ["hn", "collections", wsId],
    queryFn: () => colsFn({ data: { workspaceId: wsId } }),
    enabled: !!wsId,
  });

  const recsQ = useQuery({
    queryKey: ["hn", "records", wsId, collection],
    queryFn: () => recsFn({ data: { workspaceId: wsId, collection: collection || undefined, limit: 100 } }),
    enabled: !!wsId,
  });

  const sitesQ = useQuery({
    queryKey: ["hn", "sites", wsId],
    queryFn: () => sitesFn({ data: { workspaceId: wsId } }),
    enabled: !!wsId,
  });

  const storageQ = useQuery({
    queryKey: ["hn", "storage", wsId],
    queryFn: () => storageFn({ data: { workspaceId: wsId, limit: 20 } }),
    enabled: !!wsId,
  });

  const createMut = useMutation({
    mutationFn: (label: string) => createKeyFn({ data: { workspaceId: wsId, label } }),
    onSuccess: (res) => {
      setNewKey(res.key);
      qc.invalidateQueries({ queryKey: ["hn", "keys"] });
    },
  });

  const revokeMut = useMutation({
    mutationFn: (keyId: string) => revokeFn({ data: { keyId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hn", "keys"] }),
  });

  const siteMut = useMutation({
    mutationFn: () => registerSiteFn({ data: { workspaceId: wsId, url: siteUrl } }),
    onSuccess: () => {
      setSiteUrl("https://");
      qc.invalidateQueries({ queryKey: ["hn", "sites", wsId] });
    },
  });

  const authMut = useMutation({
    mutationFn: (siteId: string) => enableAuthFn({ data: { siteId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hn", "sites", wsId] }),
  });

  const storageMut = useMutation({
    mutationFn: (siteId: string) => enableStorageFn({ data: { siteId, scope: "private" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hn", "sites", wsId] });
      qc.invalidateQueries({ queryKey: ["hn", "storage", wsId] });
    },
  });

  const wsKeys = useMemo(
    () => (keysQ.data?.keys ?? []).filter((k) => k.workspace_id === wsId),
    [keysQ.data, wsId],
  );

  const snippet = useMemo(() => {
    const k = newKey ?? "YOUR_API_KEY";
    return `<script src="https://hn-bd.online/hn-data.js"></script>
<script src="https://hn-bd.online/hn-storage.js"></script>
<script src="https://hn-bd.online/hn-sso.js" data-app-key="YOUR_SSO_APP_KEY"></script>
<script>
  const db = HNData.init({ apiKey: "${k}", baseUrl: "https://hn-bd.online" });
  const storage = HNStorage.init({ apiKey: "${k}", baseUrl: "https://hn-bd.online", siteHost: window.location.hostname });
  await db.insert("posts", { title: "Hello", body: "World" });
  const { items } = await db.list("posts", { limit: 20 });
  // storage.upload(fileInput.files[0])
  // window.HN.signIn() / window.HN.me()
</script>`;
  }, [newKey]);

  return (
    <DashboardShell title="HN Data Platform">
      <p className="mb-6 text-sm text-muted-foreground">
        الآن المنصة تتوسع إلى <b>Data + Auth + Storage</b> لمواقع <b>hn-groupe</b> من مكان واحد.
      </p>

      <div className="mb-6 rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <Database className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">Workspace:</span>
        <select value={wsId} onChange={(e) => setWsId(e.target.value)} className="rounded-md border border-border bg-input px-3 py-1.5 text-sm">
          {(wsQ.data?.workspaces ?? []).map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.slug})</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{wsId.slice(0, 8)}</span>
      </div>

      {newKey && (
        <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
          <div className="mb-2 flex items-center gap-2 font-medium text-yellow-500">
            <AlertTriangle className="h-4 w-4" /> احفظ هذا المفتاح الآن — لن يظهر مرة أخرى
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-sm">{newKey}</code>
            <button onClick={() => navigator.clipboard.writeText(newKey)} className="rounded-md border border-border px-3 py-2">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <section className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 font-medium"><Globe className="h-4 w-4" /> المواقع المربوطة</div>
          <form onSubmit={(e) => { e.preventDefault(); if (wsId) siteMut.mutate(); }} className="flex gap-2">
            <input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://example.com" className="w-72 rounded-md border border-border bg-input px-3 py-1.5 text-sm" />
            <button type="submit" disabled={!wsId || siteMut.isPending} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">
              <Plus className="h-3 w-3" /> إضافة
            </button>
          </form>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-4 py-2">الموقع</th>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Auth</th>
              <th className="px-4 py-2">Storage</th>
              <th className="px-4 py-2">SSO Key</th>
            </tr>
          </thead>
          <tbody>
            {(sitesQ.data?.sites ?? []).length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">أضف أول موقع هنا لتفعيل خدماته المركزية.</td></tr>
            ) : (sitesQ.data?.sites ?? []).map((site) => (
              <tr key={site.id} className="border-t border-border align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{site.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{site.site_url}</div>
                </td>
                <td className="px-4 py-3 text-primary text-xs">{site.data_enabled ? "Enabled" : "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {site.auth_enabled ? (
                    <span className="text-primary">Enabled</span>
                  ) : (
                    <button onClick={() => authMut.mutate(site.id)} className="hover:underline text-primary">تفعيل Auth</button>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {site.storage_enabled ? (
                    <span className="text-primary">{site.storage_scope}</span>
                  ) : (
                    <button onClick={() => storageMut.mutate(site.id)} className="hover:underline text-primary">تفعيل Storage</button>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{site.sso_app_key ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 font-medium"><KeyRound className="h-4 w-4" /> API Keys</div>
          <form onSubmit={(e) => { e.preventDefault(); if (wsId) createMut.mutate(keyLabel); }} className="flex gap-2">
            <input value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder="label" className="rounded-md border border-border bg-input px-2 py-1 text-sm" />
            <button type="submit" disabled={!wsId || createMut.isPending} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">
              <Plus className="h-3 w-3" /> Generate
            </button>
          </form>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">Hint</th>
              <th className="px-4 py-2">Last used</th>
              <th className="px-4 py-2">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {wsKeys.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">لا توجد مفاتيح بعد.</td></tr>
            ) : wsKeys.map((k) => (
              <tr key={k.id} className="border-t border-border">
                <td className="px-4 py-2">{k.label}</td>
                <td className="px-4 py-2 font-mono text-xs">{k.key_hint}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}</td>
                <td className="px-4 py-2 text-xs">{k.revoked_at ? <span className="text-destructive">Revoked</span> : <span className="text-primary">Active</span>}</td>
                <td className="px-4 py-2 text-right">{!k.revoked_at && <button onClick={() => revokeMut.mutate(k.id)} className="text-destructive text-xs hover:underline">Revoke</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
        <header className="border-b border-border px-4 py-3 font-medium">كود التركيب الموحّد</header>
        <pre className="p-4 text-xs overflow-x-auto bg-background/40 font-mono leading-relaxed whitespace-pre">{snippet}</pre>
        <button onClick={() => navigator.clipboard.writeText(snippet)} className="m-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
          <Copy className="h-3 w-3" /> نسخ
        </button>
      </section>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="font-medium">السجلات</div>
            <select value={collection} onChange={(e) => setCollection(e.target.value)} className="rounded-md border border-border bg-input px-2 py-1 text-sm">
              <option value="">كل المجموعات</option>
              {(colsQ.data?.collections ?? []).map((c) => (
                <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
              ))}
            </select>
          </header>
          <div className="max-h-[360px] overflow-auto p-4 text-xs">
            {(recsQ.data?.records ?? []).length === 0 ? "لا توجد بيانات بعد." : (recsQ.data?.records ?? []).map((r) => (
              <div key={r.id} className="border-b border-border py-3 last:border-b-0">
                <div className="mb-1 font-mono text-primary">{r.collection}</div>
                <pre className="whitespace-pre-wrap break-all text-muted-foreground">{JSON.stringify(r.data, null, 0)}</pre>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3 font-medium"><HardDrive className="h-4 w-4" /> آخر ملفات Storage</header>
          <div className="max-h-[360px] overflow-auto p-4 text-xs">
            {(storageQ.data?.objects ?? []).length === 0 ? "لا توجد ملفات بعد." : (storageQ.data?.objects ?? []).map((obj) => (
              <div key={obj.id} className="border-b border-border py-3 last:border-b-0">
                <div className="font-medium">{obj.file_name}</div>
                <div className="font-mono text-muted-foreground">{obj.object_key}</div>
                <div className="mt-1 text-muted-foreground">{obj.size_bytes} bytes · {obj.visibility}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" /> الخطوة التالية</div>
        <p className="text-sm text-muted-foreground">
          في الخطوة القادمة سأربط رفع الملفات فعلياً من واجهة الموقع، وأضيف شاشة إدارة جلسات المستخدمين الموحّدة لكل موقع مربوط.
        </p>
      </section>
    </DashboardShell>
  );
}

