import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Copy, KeyRound, AlertTriangle, Plus, Database, Globe, HardDrive, ShieldCheck, Upload, Trash2, Users } from "lucide-react";
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
  uploadStorageObject,
  deleteStorageObject,
  deleteSite,
  listHnUsers,
} from "@/lib/platform/sites.functions";

export const Route = createFileRoute("/dashboard/hn-data")({
  head: () => ({ meta: [{ title: "HN Data Platform — DB·GUARD" }] }),
  component: HnDataPage,
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

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
  const deleteSiteFn = useServerFn(deleteSite);
  const storageFn = useServerFn(listStorageObjects);
  const uploadFn = useServerFn(uploadStorageObject);
  const deleteObjFn = useServerFn(deleteStorageObject);
  const usersFn = useServerFn(listHnUsers);

  const wsQ = useQuery({ queryKey: ["hn", "workspaces"], queryFn: () => wsFn() });
  const keysQ = useQuery({ queryKey: ["hn", "keys"], queryFn: () => keysFn() });

  const [wsId, setWsId] = useState<string>("");
  const [collection, setCollection] = useState<string>("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyLabel, setKeyLabel] = useState("default");
  const [siteUrl, setSiteUrl] = useState("https://");
  const [uploadSiteId, setUploadSiteId] = useState<string>("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const fileRef = useRef<HTMLInputElement>(null);

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
    queryFn: () => storageFn({ data: { workspaceId: wsId, limit: 30 } }),
    enabled: !!wsId,
  });
  const usersQ = useQuery({ queryKey: ["hn", "users"], queryFn: () => usersFn({ data: { limit: 50 } }) });

  const createMut = useMutation({
    mutationFn: (label: string) => createKeyFn({ data: { workspaceId: wsId, label } }),
    onSuccess: (res) => { setNewKey(res.key); qc.invalidateQueries({ queryKey: ["hn", "keys"] }); },
  });
  const revokeMut = useMutation({
    mutationFn: (keyId: string) => revokeFn({ data: { keyId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hn", "keys"] }),
  });
  const siteMut = useMutation({
    mutationFn: () => registerSiteFn({ data: { workspaceId: wsId, url: siteUrl } }),
    onSuccess: () => { setSiteUrl("https://"); qc.invalidateQueries({ queryKey: ["hn", "sites", wsId] }); },
  });
  const authMut = useMutation({
    mutationFn: (siteId: string) => enableAuthFn({ data: { siteId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hn", "sites", wsId] }),
  });
  const storMut = useMutation({
    mutationFn: (siteId: string) => enableStorageFn({ data: { siteId, scope: "private" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hn", "sites", wsId] }),
  });
  const delSiteMut = useMutation({
    mutationFn: (siteId: string) => deleteSiteFn({ data: { siteId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hn", "sites", wsId] }),
  });
  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const dataBase64 = await fileToBase64(file);
      return uploadFn({
        data: {
          workspaceId: wsId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          dataBase64,
          siteId: uploadSiteId || undefined,
          visibility,
        },
      });
    },
    onSuccess: () => {
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["hn", "storage", wsId] });
    },
  });
  const delObjMut = useMutation({
    mutationFn: (objectId: string) => deleteObjFn({ data: { objectId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hn", "storage", wsId] }),
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
  const storage = HNStorage.init({ apiKey: "${k}", baseUrl: "https://hn-bd.online", siteHost: location.hostname });
  await db.insert("posts", { title: "Hello" });
  // storage.upload(fileInput.files[0])
  // window.HN.signIn() / window.HN.me()
</script>`;
  }, [newKey]);

  return (
    <DashboardShell title="HN Data Platform">
      <p className="mb-6 text-sm text-muted-foreground">
        منصة <b>Data + Auth + Storage</b> الموحّدة لمواقع <b>hn-groupe</b> — قاعدة بيانات، تخزين، ومستخدمون من مكان واحد.
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
              <th />
            </tr>
          </thead>
          <tbody>
            {(sitesQ.data?.sites ?? []).length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">أضف أول موقع هنا لتفعيل خدماته المركزية.</td></tr>
            ) : (sitesQ.data?.sites ?? []).map((site) => (
              <tr key={site.id} className="border-t border-border align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{site.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{site.site_url}</div>
                </td>
                <td className="px-4 py-3 text-primary text-xs">{site.data_enabled ? "Enabled" : "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {site.auth_enabled ? <span className="text-primary">Enabled</span> : (
                    <button onClick={() => authMut.mutate(site.id)} className="hover:underline text-primary">تفعيل</button>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {site.storage_enabled ? <span className="text-primary">{site.storage_scope}</span> : (
                    <button onClick={() => storMut.mutate(site.id)} className="hover:underline text-primary">تفعيل</button>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{site.sso_app_key ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { if (confirm(`حذف ${site.name}?`)) delSiteMut.mutate(site.id); }} className="text-destructive text-xs hover:underline">حذف</button>
                </td>
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

      <section className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 font-medium"><Upload className="h-4 w-4" /> رفع ملف إلى Storage</div>
          <select value={uploadSiteId} onChange={(e) => setUploadSiteId(e.target.value)} className="rounded-md border border-border bg-input px-2 py-1 text-xs">
            <option value="">عام (workspace)</option>
            {(sitesQ.data?.sites ?? []).filter((s) => s.storage_enabled).map((s) => (
              <option key={s.id} value={s.id}>{s.site_host}</option>
            ))}
          </select>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as "private" | "public")} className="rounded-md border border-border bg-input px-2 py-1 text-xs">
            <option value="private">خاص</option>
            <option value="public">عام</option>
          </select>
          <input
            ref={fileRef}
            type="file"
            disabled={!wsId || uploadMut.isPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMut.mutate(f);
            }}
            className="text-xs"
          />
          {uploadMut.isPending && <span className="text-xs text-muted-foreground">جاري الرفع...</span>}
          {uploadMut.isError && <span className="text-xs text-destructive">فشل الرفع</span>}
        </header>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs">
              <tr>
                <th className="px-4 py-2">الملف</th>
                <th className="px-4 py-2">النوع</th>
                <th className="px-4 py-2">الحجم</th>
                <th className="px-4 py-2">الرؤية</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(storageQ.data?.objects ?? []).length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">لا توجد ملفات بعد.</td></tr>
              ) : (storageQ.data?.objects ?? []).map((obj) => (
                <tr key={obj.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div className="font-medium">{obj.file_name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{obj.object_key}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{obj.content_type || "—"}</td>
                  <td className="px-4 py-2 text-xs">{(obj.size_bytes / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-2 text-xs">{obj.visibility}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => delObjMut.mutate(obj.id)} className="inline-flex items-center gap-1 text-destructive text-xs hover:underline">
                      <Trash2 className="h-3 w-3" /> حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <header className="flex items-center gap-2 border-b border-border px-4 py-3 font-medium">
            <Users className="h-4 w-4" /> مستخدمو SSO
            {usersQ.data?.isOwner && <span className="text-xs text-muted-foreground">(عرض كامل)</span>}
          </header>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-3 py-2">المستخدم</th>
                  <th className="px-3 py-2">المصدر</th>
                  <th className="px-3 py-2">آخر دخول</th>
                </tr>
              </thead>
              <tbody>
                {(usersQ.data?.users ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">لا مستخدمين بعد.</td></tr>
                ) : (usersQ.data?.users ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{u.full_name}</div>
                      <div className="text-muted-foreground">{u.email}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{u.hn_user_code}</div>
                    </td>
                    <td className="px-3 py-2">{u.source_app || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" /> الخطوة التالية</div>
        <p className="text-sm text-muted-foreground">
          المنصة الآن جاهزة فعليًا: <b>قواعد بيانات</b> + <b>تخزين ملفات (رفع/حذف)</b> + <b>SSO موحّد</b> + <b>مفاتيح API</b>.
          الخطوة التالية: ربط سيرفر التخزين الخاص بك (S3/R2 مخصص) ولوحة سجلات الدخول لكل موقع.
        </p>
      </section>
    </DashboardShell>
  );
}
