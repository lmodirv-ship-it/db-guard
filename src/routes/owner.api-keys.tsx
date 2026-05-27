import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";
import { listAllApiKeysForOwner } from "@/lib/platform/owner.functions";
import { Key, Eye, EyeOff, Copy, Check, ShieldAlert } from "lucide-react";
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

export const Route = createFileRoute("/owner/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — DB·GUARD" }] }),
  component: OwnerApiKeysPage,
});

function OwnerApiKeysPage() {
  const fetchKeys = useServerFn(listAllApiKeysForOwner);
  const { data, isLoading, error } = useQuery({
    queryKey: ["owner", "api-keys"],
    queryFn: () => fetchKeys(),
  });

  const keys = (data?.keys ?? []) as ApiKeyRow[];

  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="عرض جميع مفاتيح الـ API الصادرة في المنصّة (صلاحيات المالك فقط)."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-amber-500">معلومات حسّاسة</div>
          <p className="text-muted-foreground mt-1">
            هذه المفاتيح تمنح وصولاً كاملاً للـ API الخاص بكل مساحة عمل. لا تشاركها مع أي شخص.
          </p>
        </div>
      </div>

      <Panel title={`المفاتيح (${keys.length})`}>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-destructive">فشل التحميل</div>
        ) : keys.length === 0 ? (
          <EmptyState icon={Key} title="لا توجد مفاتيح بعد" description="سيتم عرض كل مفتاح يتم توليده هنا." />
        ) : (
          <div className="space-y-3">
            {keys.map((k) => <KeyRow key={k.id} k={k} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}

function KeyRow({ k }: { k: ApiKeyRow }) {
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
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center">
            <Key className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">{k.label}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(k.created_at).toLocaleString()} · {isRevoked ? <span className="text-destructive">ملغى</span> : <span className="text-emerald-500">نشط</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRevealed((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs hover:border-primary/40 transition"
            disabled={!k.full_key}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealed ? "إخفاء" : "إظهار"}
          </button>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs hover:border-primary/40 transition"
            disabled={!k.full_key}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            نسخ
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-muted/30 border border-border/60 px-3 py-2 font-mono text-xs break-all">
        {k.full_key
          ? (revealed ? k.full_key : `${k.key_prefix}${"•".repeat(24)}${k.full_key.slice(-4)}`)
          : <span className="text-muted-foreground">مفتاح قديم — لم يتم تخزينه (تم توليده قبل تفعيل هذه الميزة)</span>}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Workspace: <span className="font-mono">{k.workspace_id.slice(0, 8)}…</span>
      </div>
    </div>
  );
}
