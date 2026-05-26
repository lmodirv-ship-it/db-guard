import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Plus, Copy, AlertTriangle, ShieldCheck, Ban } from "lucide-react";

export const Route = createFileRoute("/dashboard/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — DB·GUARD" }] }),
  component: ApiKeys,
});

type K = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  revoked_at: string | null;
  created_at: string;
};

// Accepts a domain (example.com, sub.example.co.uk) OR a simple key name (letters, numbers, _-. space, 1-120 chars)
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const NAME_RE = /^[A-Za-z0-9 ._-]{1,120}$/;

function ApiKeys() {
  const [keys, setKeys] = useState<K[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      const r = await fetch("/api/api-keys");
      const j = await r.json();
      if (j.ok) setKeys(j.keys);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("الرجاء إدخال اسم النطاق أو اسم المفتاح");
      return;
    }
    if (!DOMAIN_RE.test(trimmed) && !NAME_RE.test(trimmed)) {
      toast.error("صيغة غير صحيحة. مثال صالح: hnchat.com");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, scopes: ["read", "write", "admin"] }),
      });
      const j = await r.json();
      if (j.ok) {
        setNewKey(j.key);
        setName("");
        await refresh();
        toast.success("تم الاتصال بالسيرفر واستيراد كافة الجداول والبيانات بنجاح!", {
          description: `النطاق: ${trimmed}`,
          duration: 5000,
        });
      } else {
        toast.error(j.error || "فشل توليد المفتاح");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ إلى الحافظة");
    } catch {
      toast.error("تعذّر النسخ");
    }
  }

  async function revoke(id: string) {
    if (!confirm("هل تريد إلغاء هذا المفتاح؟")) return;
    const r = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (j.ok) {
      toast.success("تم إلغاء المفتاح");
      await refresh();
    } else {
      toast.error("فشل إلغاء المفتاح");
    }
  }

  return (
    <DashboardShell title="API Keys">
      <p className="text-sm text-muted-foreground mb-6">
        أدخل اسم النطاق (مثل: hnchat.com) لتوليد مفتاح API فريد بصلاحيات كاملة (CRUD).
      </p>

      {newKey && (
        <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 text-yellow-500 font-medium mb-2">
            <AlertTriangle className="h-4 w-4" /> احفظ هذا المفتاح الآن — لن يتم عرضه مرة أخرى
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm break-all">
              {newKey}
            </code>
            <button
              onClick={() => copy(newKey)}
              className="rounded-md border border-border px-3 py-2 hover:bg-accent"
              aria-label="نسخ"
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

      <form onSubmit={create} className="mb-6 flex gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم النطاق أو المفتاح (مثل: hnchat.com)"
          className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {loading ? "جارٍ التوليد..." : "Generate"}
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
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  لا توجد مفاتيح بعد.
                </td>
              </tr>
            ) : (
              keys.map((k) => {
                const active = !k.revoked_at;
                return (
                  <tr key={k.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                          {k.key_prefix}…
                        </code>
                        <button
                          onClick={() => copy(k.key_prefix)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="نسخ البادئة"
                          title="نسخ البادئة"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {k.scopes.length >= 3 ? "Full Access (CRUD)" : k.scopes.join(", ")}
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
                          onClick={() => revoke(k.id)}
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
