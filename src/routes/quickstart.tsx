import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, Rocket, Database, Lock, FolderOpen } from "lucide-react";

export const Route = createFileRoute("/quickstart")({
  head: () => ({
    meta: [
      { title: "Quick Start — HN Cloud" },
      { name: "description", content: "اربط أي موقع Lovable جديد بسيرفر hn-bd.online في 3 خطوات." },
    ],
  }),
  component: QuickStart,
});

const BASE = "https://hn-bd.online";

const STEP1 = `<!-- ضع هذه السطور في <head> -->
<script src="${BASE}/hn-data.js"></script>
<script src="${BASE}/hn-sso.js"></script>
<script src="${BASE}/hn-storage.js"></script>`;

const STEP2 = `<script>
  // 1) المفتاح: أنشئه من لوحة HN → API Keys
  const API_KEY = "dbg_xxxxxxxxxxxxxxxx";

  window.HN = {
    db:      HNData.init({    apiKey: API_KEY, baseUrl: "${BASE}" }),
    auth:    HNSso.init({     apiKey: API_KEY, baseUrl: "${BASE}" }),
    storage: HNStorage.init({ apiKey: API_KEY, baseUrl: "${BASE}" }),
  };
</script>`;

const SNIPPETS: { title: string; icon: React.ReactNode; code: string }[] = [
  {
    title: "تسجيل الدخول الموحّد (SSO)",
    icon: <Lock className="w-4 h-4" />,
    code: `// يفتح صفحة دخول hn-bd.online ويرجع للموقع بـ ticket
HN.auth.login({ returnTo: location.href });

// عند العودة: تحقق من الجلسة
const user = await HN.auth.me();
console.log(user); // { id, email, name }

// تسجيل الخروج
await HN.auth.logout();`,
  },
  {
    title: "قاعدة بيانات الموقع",
    icon: <Database className="w-4 h-4" />,
    code: `// إضافة سجل
await HN.db.insert("posts", { title: "مرحبا", body: "..." });

// قراءة
const { items } = await HN.db.list("posts", { limit: 20 });

// حذف
await HN.db.remove("posts", id);`,
  },
  {
    title: "رفع الملفات",
    icon: <FolderOpen className="w-4 h-4" />,
    code: `// رفع ملف من <input type="file">
const file = document.querySelector("#f").files[0];
const { url } = await HN.storage.upload(file, { folder: "uploads" });
console.log(url);`,
  },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-sm leading-relaxed font-mono text-foreground">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute top-2 left-2 px-2 py-1 rounded-md bg-background/90 border border-border text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        {copied ? "تم" : "نسخ"}
      </button>
    </div>
  );
}

function QuickStart() {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Quick Start</h1>
          </div>
          <Link to="/owner" className="text-sm text-muted-foreground hover:text-foreground">
            لوحة التحكم ←
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        <section>
          <h2 className="text-3xl font-bold mb-3">اربط موقعك بسيرفر HN في 3 خطوات</h2>
          <p className="text-muted-foreground leading-relaxed">
            أي موقع Lovable جديد يصبح متصلاً بـ <span className="text-foreground font-medium">hn-bd.online</span>:
            قاعدة بيانات خاصة به، تسجيل دخول موحّد، وتخزين ملفات — بدون أي backend إضافي.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">1</span>
            <h3 className="text-xl font-semibold">أضف السكربتات في <code className="text-sm bg-muted px-1.5 py-0.5 rounded">&lt;head&gt;</code></h3>
          </div>
          <CodeBlock code={STEP1} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">2</span>
            <h3 className="text-xl font-semibold">هيّئ المفتاح وأنشئ <code className="text-sm bg-muted px-1.5 py-0.5 rounded">window.HN</code></h3>
          </div>
          <CodeBlock code={STEP2} />
          <p className="text-sm text-muted-foreground">
            احصل على المفتاح من{" "}
            <Link to="/owner/api-keys" className="text-primary underline">
              لوحة HN → API Keys
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">3</span>
            <h3 className="text-xl font-semibold">استخدمه في أي مكان</h3>
          </div>
          <div className="grid gap-4">
            {SNIPPETS.map((s) => (
              <div key={s.title} className="border border-border rounded-xl p-5 bg-card/30">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                  <span className="text-primary">{s.icon}</span>
                  {s.title}
                </div>
                <CodeBlock code={s.code} />
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <h3 className="text-lg font-semibold mb-2">هذا كل شيء.</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            موقعك أصبح مستقلاً ذاتياً: قاعدة بياناته معزولة في سيرفر HN، المستخدمون يدخلون
            بحساب واحد إلى كل مواقعك، والملفات محفوظة في تخزين HN. لا تعتمد على أي مصدر آخر.
          </p>
        </section>
      </main>
    </div>
  );
}
