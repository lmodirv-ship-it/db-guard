import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";
import {
  getSiteOverview,
  ownerGenerateApiKey,
  ownerRevokeApiKey,
  ownerToggleSiteFeature,
} from "@/lib/platform/owner.functions";
import {
  ArrowLeft, KeyRound, Copy, Eye, EyeOff, Plus, Loader2, Trash2,
  Database, HardDrive, ShieldCheck, ExternalLink, Table2, Code2,
  Rocket, FileCode2, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

type ApiKey = {
  id: string;
  label: string;
  key_prefix: string;
  key_hint: string;
  full_key: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};
type Collection = { name: string; count: number };

export const Route = createFileRoute("/owner/projects/$siteId")({
  head: () => ({ meta: [{ title: "Project — DB·GUARD" }] }),
  component: SiteDetailPage,
});

function SiteDetailPage() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getSiteOverview);
  const genKey = useServerFn(ownerGenerateApiKey);
  const revokeKey = useServerFn(ownerRevokeApiKey);
  const toggle = useServerFn(ownerToggleSiteFeature);

  const q = useQuery({
    queryKey: ["owner", "site-overview", siteId],
    queryFn: () => fetchOverview({ data: { siteId } }),
  });

  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: (workspaceId: string) =>
      genKey({ data: { workspaceId, label: "site-key" } }),
    onSuccess: async (r: { id: string; key: string }) => {
      await navigator.clipboard.writeText(r.key).catch(() => {});
      toast.success("تم توليد المفتاح ونسخه");
      setRevealed((s) => ({ ...s, [r.id]: true }));
      qc.invalidateQueries({ queryKey: ["owner", "site-overview", siteId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (keyId: string) => revokeKey({ data: { keyId } }),
    onSuccess: () => {
      toast.success("تم إلغاء المفتاح");
      qc.invalidateQueries({ queryKey: ["owner", "site-overview", siteId] });
    },
  });

  const flip = useMutation({
    mutationFn: (v: { feature: "auth" | "storage" | "data"; enabled: boolean }) =>
      toggle({ data: { siteId, ...v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner", "site-overview", siteId] }),
  });

  if (q.isLoading) return <div className="p-10 text-sm text-muted-foreground">جارٍ التحميل…</div>;
  if (q.isError || !q.data) return <div className="p-10 text-sm text-destructive">تعذر التحميل</div>;

  const { site, workspace, keys, collections, storageCount } = q.data as {
    site: { id: string; name: string; site_url: string; site_host: string; workspace_id: string; status: string; auth_enabled: boolean; storage_enabled: boolean; data_enabled: boolean; verified_at: string | null; created_at: string };
    workspace: { id: string; name: string; slug: string; hn_user_id: string } | null;
    keys: ApiKey[];
    collections: Collection[];
    storageCount: number;
  };
  const activeKey =
    (selectedKeyId && keys.find((k: ApiKey) => k.id === selectedKeyId)) ||
    keys.find((k: ApiKey) => !k.revoked_at && k.full_key) ||
    keys.find((k: ApiKey) => !k.revoked_at) ||
    keys[0];
  const apiKeyForSnippets = activeKey?.full_key ?? "YOUR_API_KEY";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://hn-bd.online";

  return (
    <div>
      <Link to="/owner/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> رجوع للمشاريع
      </Link>

      <PageHeader
        title={site.name}
        subtitle="كل ما تحتاجه لربط هذا الموقع — مفاتيح، أكواد جاهزة، وجداول مكتشفة تلقائياً."
        actions={
          <a href={site.site_url} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs hover:border-primary/40">
            <ExternalLink className="h-3.5 w-3.5" /> فتح الموقع
          </a>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Table2} label="جداول مكتشفة" value={collections.length} />
        <StatCard icon={HardDrive} label="ملفات التخزين" value={storageCount} />
        <StatCard icon={KeyRound} label="مفاتيح API" value={keys.filter((k: ApiKey) => !k.revoked_at).length} />
      </div>

      {/* Features */}
      <Panel title="الميزات المُفعّلة" className="mb-6">
        <div className="grid grid-cols-3 gap-2">
          <FeatureToggle icon={Database} label="Data" enabled={site.data_enabled}
            onChange={(v) => flip.mutate({ feature: "data", enabled: v })} />
          <FeatureToggle icon={HardDrive} label="Storage" enabled={site.storage_enabled}
            onChange={(v) => flip.mutate({ feature: "storage", enabled: v })} />
          <FeatureToggle icon={ShieldCheck} label="Auth" enabled={site.auth_enabled}
            onChange={(v) => flip.mutate({ feature: "auth", enabled: v })} />
        </div>
      </Panel>

      {/* API keys */}
      <Panel
        title="مفاتيح API"
        right={
          <button
            onClick={() => workspace && generate.mutate(workspace.id)}
            disabled={!workspace || generate.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            توليد مفتاح
          </button>
        }
        className="mb-6"
      >
        {keys.length === 0 ? (
          <EmptyState icon={KeyRound} title="لا توجد مفاتيح بعد" description="اضغط «توليد مفتاح» لإنشاء أول مفتاح." />
        ) : (
          <div className="space-y-2">
            {keys.map((k: ApiKey) => {
              const isOpen = !!revealed[k.id];
              const display = k.revoked_at ? "— ملغاة —" : (k.full_key ?? "— مفتاح قديم —");
              const isActive = activeKey?.id === k.id;
              return (
                <div
                  key={k.id}
                  className={`rounded-xl border p-3 ${isActive ? "border-primary/40 bg-primary/5" : "border-border bg-background/40"}`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedKeyId(k.id)}
                      className="text-xs font-semibold hover:text-primary"
                    >
                      {k.label} {isActive && <span className="text-[10px] text-primary">• مستخدم في الأكواد</span>}
                    </button>
                    <div className="flex items-center gap-1">
                      {!k.revoked_at && k.full_key && (
                        <>
                          <button onClick={() => setRevealed((s) => ({ ...s, [k.id]: !isOpen }))}
                                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                            {isOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => { navigator.clipboard.writeText(k.full_key!); toast.success("نُسخ"); }}
                                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {!k.revoked_at && (
                        <button onClick={() => { if (confirm("إلغاء المفتاح؟")) revoke.mutate(k.id); }}
                                className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] text-muted-foreground break-all">
                    {isOpen && k.full_key ? k.full_key : (k.key_hint || display)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Tables auto-discovered */}
      <Panel title="الجداول المُكتشفة تلقائياً" className="mb-6">
        <p className="text-xs text-muted-foreground mb-3">
          تُنشَأ هذه الجداول تلقائياً بمجرد أن يُرسل موقعك أول سجل لكل اسم Collection.
        </p>
        {collections.length === 0 ? (
          <EmptyState icon={Table2} title="لا توجد جداول بعد" description="أرسل أول سجل من الكود أدناه ليظهر الجدول هنا." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {collections.map((c: Collection) => (
              <div key={c.name} className="rounded-lg border border-border bg-background/40 px-3 py-2 flex items-center justify-between">
                <span className="font-mono text-xs">{c.name}</span>
                <span className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Code snippets */}
      <Panel title="أكواد الربط الجاهزة" className="mb-6">
        <div className="space-y-5">
          <Snippet
            icon={Database} title="Data (قاعدة البيانات)"
            code={`<script src="${baseUrl}/hn-data.js"></script>
<script>
  const db = HNData.init({
    apiKey: '${apiKeyForSnippets}',
    baseUrl: '${baseUrl}'
  });

  // إضافة سجل (يُنشئ الجدول تلقائياً)
  await db.insert('posts', { title: 'Hello', body: '...' });

  // قراءة آخر السجلات
  const { items } = await db.list('posts', { limit: 20 });

  // حذف سجل
  await db.remove('posts', id);
</script>`}
          />
          <Snippet
            icon={HardDrive} title="Storage (تخزين الملفات)"
            code={`<script src="${baseUrl}/hn-storage.js"></script>
<script>
  const storage = HNStorage.init({
    apiKey: '${apiKeyForSnippets}',
    baseUrl: '${baseUrl}'
  });

  // رفع ملف من <input type="file">
  const file = document.querySelector('input[type=file]').files[0];
  const res = await storage.upload(file);
  console.log(res.url);
</script>`}
          />
          <Snippet
            icon={ShieldCheck} title="Auth (تسجيل الدخول الموحّد SSO)"
            code={`<!-- ضع هذا في <head> -->
<script src="${baseUrl}/hn-sso.js" data-app-key="${workspace?.slug ?? site.site_host}"></script>
<script>
  // تسجيل الدخول
  document.getElementById('login').onclick = () => window.HN.signIn();

  // معرفة المستخدم الحالي
  if (window.HN.user) {
    console.log('Welcome', window.HN.user.email);
  }
</script>`}
          />
          <Snippet
            icon={Code2} title="REST API مباشرة (cURL)"
            code={`# إضافة سجل
curl -X POST '${baseUrl}/api/public/v1/data/posts' \\
  -H 'X-HN-Api-Key: ${apiKeyForSnippets}' \\
  -H 'Content-Type: application/json' \\
  -d '{"data":{"title":"Hello"}}'

# قراءة السجلات
curl '${baseUrl}/api/public/v1/data/posts?limit=20' \\
  -H 'X-HN-Api-Key: ${apiKeyForSnippets}'`}
          />
        </div>
      </Panel>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
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
        enabled ? "border-primary/40 bg-primary/10 text-primary"
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

function Snippet({ icon: Icon, title, code }: { icon: React.ComponentType<{ className?: string }>; title: string; code: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Icon className="h-3.5 w-3.5 text-primary" /> {title}
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(code); toast.success("تم نسخ الكود"); }}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
        >
          <Copy className="h-3 w-3" /> نسخ
        </button>
      </div>
      <pre className="p-3 text-[11px] font-mono overflow-x-auto leading-relaxed text-foreground/90 whitespace-pre">
{code}
      </pre>
    </div>
  );
}
