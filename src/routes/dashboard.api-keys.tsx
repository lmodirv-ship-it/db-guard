import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Plus, Copy, AlertTriangle, ShieldCheck, Ban } from "lucide-react";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
} from "@/lib/platform/api-keys.functions";

export const Route = createFileRoute("/dashboard/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — DB·GUARD" }] }),
  component: ApiKeys,
});

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const NAME_RE = /^[A-Za-z0-9 ._-]{1,120}$/;

function ApiKeys() {
  const qc = useQueryClient();
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);

  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["api_keys"],
    queryFn: () => list(),
  });
  const keys = data?.keys ?? [];

  const createMut = useMutation({
    mutationFn: (n: string) => create({ data: { name: n } }),
    onSuccess: (res, n) => {
      setNewKey(res.key);
      setName("");
      qc.invalidateQueries({ queryKey: ["api_keys"] });
      toast.success("تم الاتصال بالسيرفر واستيراد كافة الجداول والبيانات بنجاح!", {
        description: `النطاق: ${n}`,
        duration: 5000,
      });
    },
    onError: (e: Error) => toast.error(e.message || "فشل توليد المفتاح"),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api_keys"] });
      toast.success("تم إلغاء المفتاح");
    },
    onError: () => toast.error("فشل إلغاء المفتاح"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = name.trim();
    if (!t) return toast.error("الرجاء إدخال اسم النطاق");
    if (!DOMAIN_RE.test(t) && !NAME_RE.test(t)) {
      return toast.error("صيغة غير صحيحة. مثال: hn-db.fun");
    }
    createMut.mutate(t);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذّر النسخ");
    }
  }

  return (
    <DashboardShell title="API Keys">
      <p className="text-sm text-muted-foreground mb-6">
        أدخل اسم النطاق (مثل: hn-db.fun) لتوليد مفتاح API محفوظ في قاعدة البيانات.
      </p>

      {newKey && (
        <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 text-yellow-500 font-medium mb-2">
            <AlertTriangle className="h-4 w-4" /> احفظ هذا المفتاح الآن — لن يُعرض مجدداً
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm break-all">
              {newKey}
            </code>
            <button
              onClick={() => copy(newKey)}
              className="rounded-md border border-border px-3 py-2 hover:bg-accent"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-3 text-xs text-muted-foreground hover:underline"
          >
            إخفاء
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="mb-6 flex gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="hn-db.fun"
          className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={createMut.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {createMut.isPending ? "جارٍ التوليد..." : "Generate"}
        </button>
      </form>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Prefix</th>
              <th className="px-4 py-3 font-medium">Scopes</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">جارٍ التحميل…</td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد مفاتيح بعد.</td></tr>
            ) : (
              keys.map((k) => {
                const active = k.status === "active" && !k.revoked_at;
                return (
                  <tr key={k.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{k.key_prefix}…</code>
                        <button
                          onClick={() => copy(k.key_prefix)}
                          className="text-muted-foreground hover:text-foreground"
                          title="نسخ البادئة"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(k.scopes?.length ?? 0) >= 3 ? "Full Access (CRUD)" : (k.scopes ?? []).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          <ShieldCheck className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          <Ban className="h-3 w-3" /> Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {active && (
                        <button
                          onClick={() => {
                            if (confirm("هل تريد إلغاء هذا المفتاح؟")) revokeMut.mutate(k.id);
                          }}
                          className="text-destructive text-xs hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
