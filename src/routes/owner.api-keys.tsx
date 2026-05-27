import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";
import {
  listAllApiKeysForOwner,
  listOwnerWorkspaces,
  ownerGenerateApiKey,
  ownerRevokeApiKey,
} from "@/lib/platform/owner.functions";
import { Key, Eye, EyeOff, Copy, Check, ShieldAlert, Plus, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

type ApiKeyRow = {
  id: string;
  label: string;
  key_prefix: string;
  key_hint: string;
  full_key: string | null;
  workspace_id: string;
  hn_user_id: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
  hn_user_id: string;
  hn_users: { email: string; full_name: string }[] | { email: string; full_name: string } | null;
};


export const Route = createFileRoute("/owner/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — DB·GUARD" }] }),
  component: OwnerApiKeysPage,
});

function OwnerApiKeysPage() {
  const qc = useQueryClient();
  const fetchKeys = useServerFn(listAllApiKeysForOwner);
  const fetchWs = useServerFn(listOwnerWorkspaces);
  const genKey = useServerFn(ownerGenerateApiKey);
  const revokeKey = useServerFn(ownerRevokeApiKey);

  const keysQ = useQuery({ queryKey: ["owner", "api-keys"], queryFn: () => fetchKeys() });
  const wsQ = useQuery({ queryKey: ["owner", "workspaces"], queryFn: () => fetchWs() });

  const keys = (keysQ.data?.keys ?? []) as ApiKeyRow[];
  const workspaces = (wsQ.data?.workspaces ?? []) as Workspace[];

  const wsById = useMemo(() => {
    const m = new Map<string, Workspace>();
    for (const w of workspaces) m.set(w.id, w);
    return m;
  }, [workspaces]);

  const grouped = useMemo(() => {
    const m = new Map<string, ApiKeyRow[]>();
    for (const k of keys) {
      const arr = m.get(k.workspace_id) ?? [];
      arr.push(k);
      m.set(k.workspace_id, arr);
    }
    return m;
  }, [keys]);

  const generate = useMutation({
    mutationFn: (workspaceId: string) => genKey({ data: { workspaceId, label: "owner-generated" } }),
    onSuccess: (res) => {
      toast.success("تم توليد المفتاح");
      navigator.clipboard.writeText(res.key).catch(() => {});
      qc.invalidateQueries({ queryKey: ["owner", "api-keys"] });
    },
    onError: () => toast.error("فشل التوليد"),
  });

  const revoke = useMutation({
    mutationFn: (keyId: string) => revokeKey({ data: { keyId } }),
    onSuccess: () => {
      toast.success("تم الإلغاء");
      qc.invalidateQueries({ queryKey: ["owner", "api-keys"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="ولّد واعرض مفاتيح الـ API لكل مشروع من مكان واحد."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-amber-500">صلاحيات المالك فقط</div>
          <p className="text-muted-foreground mt-1">
            كل مفتاح يمنح وصولاً كاملاً للـ API الخاص بالمشروع. عند النسخ، احفظه في مكان آمن.
          </p>
        </div>
      </div>

      {wsQ.isLoading || keysQ.isLoading ? (
        <Panel><div className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل…</div></Panel>
      ) : workspaces.length === 0 ? (
        <Panel><EmptyState icon={FolderOpen} title="لا توجد مشاريع بعد" /></Panel>
      ) : (
        <div className="space-y-4">
          {workspaces.map((w) => {
            const wsKeys = grouped.get(w.id) ?? [];
            return (
              <Panel
                key={w.id}
                title={w.name}
                right={
                  <button
                    onClick={() => generate.mutate(w.id)}
                    disabled={generate.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    توليد مفتاح
                  </button>
                }
              >
                <div className="text-xs text-muted-foreground mb-3">
                  {w.hn_users?.email ?? "—"} · <span className="font-mono">{w.id.slice(0, 8)}…</span>
                </div>
                {wsKeys.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                    لا توجد مفاتيح لهذا المشروع
                  </div>
                ) : (
                  <div className="space-y-2">
                    {wsKeys.map((k) => (
                      <KeyRow key={k.id} k={k} onRevoke={() => revoke.mutate(k.id)} />
                    ))}
                  </div>
                )}
              </Panel>
            );
          })}

          {/* Orphan keys (workspace not in list) */}
          {Array.from(grouped.entries())
            .filter(([wid]) => !wsById.has(wid))
            .map(([wid, wsKeys]) => (
              <Panel key={wid} title={`Workspace ${wid.slice(0, 8)}… (محذوف)`}>
                <div className="space-y-2">
                  {wsKeys.map((k) => (
                    <KeyRow key={k.id} k={k} onRevoke={() => revoke.mutate(k.id)} />
                  ))}
                </div>
              </Panel>
            ))}
        </div>
      )}
    </div>
  );
}

function KeyRow({ k, onRevoke }: { k: ApiKeyRow; onRevoke: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const isRevoked = !!k.revoked_at;

  const copy = async () => {
    if (!k.full_key) return;
    await navigator.clipboard.writeText(k.full_key);
    setCopied(true);
    toast.success("تم النسخ");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Key className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{k.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isRevoked ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
            {isRevoked ? "ملغى" : "نشط"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setRevealed(v => !v)} disabled={!k.full_key} className="p-1.5 rounded hover:bg-muted disabled:opacity-40" title="إظهار/إخفاء">
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button onClick={copy} disabled={!k.full_key} className="p-1.5 rounded hover:bg-muted disabled:opacity-40" title="نسخ">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {!isRevoked && (
            <button onClick={onRevoke} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="إلغاء">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 rounded bg-muted/30 border border-border/60 px-2 py-1.5 font-mono text-[11px] break-all">
        {k.full_key
          ? (revealed ? k.full_key : `${k.key_prefix}${"•".repeat(20)}${k.full_key.slice(-4)}`)
          : <span className="text-muted-foreground">مفتاح قديم — غير قابل للاسترجاع</span>}
      </div>
    </div>
  );
}
