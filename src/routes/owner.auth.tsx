import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LogIn, UserPlus, LogOut, KeyRound, ShieldCheck, Lock } from "lucide-react";
import { PageHeader, Panel } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/auth")({
  head: () => ({ meta: [{ title: "Authentication — DB·GUARD" }] }),
  component: AuthPage,
});

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  desc: string;
  endpoint: string;
  method: string;
  status: "active";
};

const FEATURES: Feature[] = [
  { icon: LogIn,       name: "تسجيل الدخول",         desc: "PBKDF2 + JWT session cookie",        endpoint: "/api/auth/login",            method: "POST",   status: "active" },
  { icon: UserPlus,    name: "إنشاء حساب",            desc: "تسجيل مستخدم جديد مع tenant مستقل", endpoint: "/api/auth/signup",           method: "POST",   status: "active" },
  { icon: LogOut,      name: "تسجيل الخروج",          desc: "مسح ملف التعريف وإنهاء الجلسة",      endpoint: "/api/auth/logout",           method: "POST",   status: "active" },
  { icon: KeyRound,    name: "استرجاع كلمة المرور",  desc: "OTP عبر البريد + رمز إعادة التعيين",  endpoint: "/api/auth/forgot-password",  method: "POST",   status: "active" },
  { icon: Lock,        name: "تغيير كلمة المرور",     desc: "تحقق من كلمة المرور الحالية",         endpoint: "/api/auth/change-password",  method: "POST",   status: "active" },
  { icon: ShieldCheck, name: "Session Management",    desc: "JWT HS256 — HttpOnly + Secure",       endpoint: "/api/auth/me",               method: "GET",    status: "active" },
  { icon: ShieldCheck, name: "حماية الصفحات الخاصة", desc: "Middleware يحجب غير المسجلين",        endpoint: "requireSession()",           method: "guard",  status: "active" },
];

function AuthPage() {
  return (
    <div>
      <PageHeader title="Authentication" subtitle="نظام مصادقة مستقل بالكامل — لا اعتمادية على Lovable أو SSO خارجي." />

      <Panel title="مكوّنات النظام">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">الميزة</th>
              <th className="px-3 py-2">الوصف</th>
              <th className="px-3 py-2">Endpoint</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <tr key={f.name} className="border-t border-border">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{f.desc}</td>
                  <td className="px-3 py-3 font-mono text-xs">{f.endpoint}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-mono bg-accent/20 text-accent">{f.method}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-xs font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel title="ملاحظات" className="mt-6">
        <ul className="text-sm text-muted-foreground space-y-2 list-disc pr-5">
          <li>كلمات المرور مُجزّأة بـ PBKDF2-SHA256 (100k iterations) + salt عشوائي لكل مستخدم.</li>
          <li>الجلسة مخزّنة في cookie باسم <code className="font-mono text-foreground">hn_session</code> مع HttpOnly و Secure و SameSite.</li>
          <li>كل صفحة محمية تتحقق من الجلسة عبر <code className="font-mono text-foreground">requireSession()</code> قبل الـ render.</li>
          <li>النظام مستقل تمامًا — لا يوجد تحويل إلى مواقع خارجية أو SSO.</li>
        </ul>
      </Panel>
    </div>
  );
}
