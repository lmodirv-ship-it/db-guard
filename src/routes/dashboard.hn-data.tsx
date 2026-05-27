import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Copy, KeyRound, AlertTriangle, Plus, Database } from "lucide-react";
import {
  listWorkspaces,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  listDataRecords,
  listCollections,
} from "@/lib/platform/dashboard.functions";

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

  const wsQ = useQuery({ queryKey: ["hn", "workspaces"], queryFn: () => wsFn() });
  const keysQ = useQuery({ queryKey: ["hn", "keys"], queryFn: () => keysFn() });

  const [wsId, setWsId] = useState<string>("");
  const [collection, setCollection] = useState<string>("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyLabel, setKeyLabel] = useState("default");

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

  const wsKeys = useMemo(
    () => (keysQ.data?.keys ?? []).filter((k) => k.workspace_id === wsId),
    [keysQ.data, wsId],
  );

  const snippet = useMemo(() => {
    const k = newKey ?? "YOUR_API_KEY";
    return `<script src="https://hn-bd.online/hn-data.js"></script>
<script>
  const db = HNData.init({ apiKey: "${k}", baseUrl: "https://hn-bd.online" });
  // Insert
  await db.insert("posts", { title: "Hello", body: "World" });
  // List
  const { items } = await db.list("posts", { limit: 20 });
  // Delete
  await db.remove("posts", items[0].id);
</script>`;
  }, [newKey]);

  return (
    <DashboardShell title="HN Data Platform">
      <p className="text-sm text-muted-foreground mb-6">
        منصة بياناتك — استخدم DB·GUARD كقاعدة بيانات وسحابة لكل مواقع <b>hn-groupe</b>.
      </p>

      {/* Workspace selector */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <Database className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">Workspace:</span>
        <select
          value={wsId}
          onChange={(e) => setWsId(e.target.value)}
          className="rounded-md border border-border bg-input px-3 py-1.5 text-sm"
        >
          {(wsQ.data?.workspaces ?? []).map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.slug})</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{wsId.slice(0, 8)}</span>
      </div>

      {/* New key surface */}
      {newKey && (
        <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 text-yellow-500 font-medium mb-2">
            <AlertTriangle className="h-4 w-4" /> احفظ هذا المفتاح الآن — لن يظهر مرة أخرى
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm break-all">{newKey}</code>
            <button
              onClick={() => navigator.clipboard.writeText(newKey)}
              className="rounded-md border border-border px-3 py-2"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-muted-foreground hover:underline">
            إخفاء
          </button>
        </div>
      )}

      {/* Keys */}
      <section className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 font-medium">
            <KeyRound className="h-4 w-4" /> API Keys (لهذا الـ Workspace)
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (wsId) createMut.mutate(keyLabel); }}
            className="flex gap-2"
          >
            <input
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              placeholder="label"
              className="rounded-md border border-border bg-input px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={!wsId || createMut.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-3 w-3" /> Generate
            </button>
          </form>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">Hint</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Last used</th>
              <th className="px-4 py-2">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {wsKeys.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">لا توجد مفاتيح بعد.</td></tr>
            ) : wsKeys.map((k) => (
              <tr key={k.id} className="border-t border-border">
                <td className="px-4 py-2">{k.label}</td>
                <td className="px-4 py-2 font-mono text-xs">{k.key_hint}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}</td>
                <td className="px-4 py-2 text-xs">
                  {k.revoked_at ? <span className="text-destructive">Revoked</span> : <span className="text-primary">Active</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  {!k.revoked_at && (
                    <button onClick={() => revokeMut.mutate(k.id)} className="text-destructive text-xs hover:underline">
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Integration snippet */}
      <section className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
        <header className="border-b border-border px-4 py-3 font-medium">كود التركيب في أي موقع hn-groupe</header>
        <pre className="p-4 text-xs overflow-x-auto bg-background/40 font-mono leading-relaxed whitespace-pre">
{snippet}
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(snippet)}
          className="m-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          <Copy className="h-3 w-3" /> نسخ
        </button>
      </section>

      {/* Records */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="font-medium">السجلات (Records)</div>
          <select
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="rounded-md border border-border bg-input px-2 py-1 text-sm"
          >
            <option value="">كل المجموعات</option>
            {(colsQ.data?.collections ?? []).map((c) => (
              <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
            ))}
          </select>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-4 py-2">Collection</th>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(recsQ.data?.records ?? []).length === 0 ? (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground text-sm">
                لا توجد بيانات بعد. ولّد مفتاح API وأرسل أول POST من موقعك.
              </td></tr>
            ) : (recsQ.data?.records ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-4 py-2 font-mono text-xs">{r.collection}</td>
                <td className="px-4 py-2 text-xs">
                  <pre className="whitespace-pre-wrap break-all text-muted-foreground">{JSON.stringify(r.data, null, 0)}</pre>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardShell>
  );
}
