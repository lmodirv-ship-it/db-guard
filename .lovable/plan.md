# خطة تحويل DB-GUARD إلى منصة SaaS عالمية

طلبك ضخم ويغطي 4 محاور كبيرة. سأنفذها على مراحل متتابعة بدون حذف أي كود حالي.

---

## المرحلة 1 — نظام i18n متعدد اللغات

**المكتبة:** `i18next` + `react-i18next` + `i18next-browser-languagedetector`

**الهيكل:**
```
src/locales/
  ├─ ar/common.json, dashboard.json, auth.json, errors.json, plans.json, tables.json, settings.json
  ├─ en/(same)
  ├─ fr/(same)
  └─ es/(same)
src/lib/i18n/index.ts        # init + detection
src/components/LanguageSwitcher.tsx
```

**المنطق:**
- اكتشاف لغة المتصفح تلقائيًا (fallback: en)
- حفظ اختيار المستخدم في `localStorage` + جدول `user_preferences`
- دعم RTL تلقائي للعربية (`dir="rtl"` على `<html>`)
- استخراج كل النصوص من المكونات الحالية (Dashboard, Auth, Tables, Records, API Keys, Backups, Logs, Team, Billing, Settings) واستبدالها بـ `t('key')`

---

## المرحلة 2 — Email OTP Authentication

**استبدال password login بـ OTP من 6 أرقام**

**جدول جديد:**
```sql
email_verification_codes (
  id, email, code_hash (sha256), purpose ('login'|'signup'),
  expires_at, used_at, attempts, ip_address, created_at
)
auth_audit_log (id, user_id, email, event, ip, user_agent, success, created_at)
```

**Server Functions:**
- `requestOtp({ email })` — يولّد code، يخزّن hash، يحدد expiry 10 دقائق، rate limit (3 طلبات/ساعة لكل بريد)
- `verifyOtp({ email, code })` — يتحقق، ينشئ Supabase session عبر `signInWithOtp` token، إذا مستخدم جديد ينفذ `provision_tenant_defaults`
- `resendOtp` — مع timer 60 ثانية

**صفحات جديدة:**
- `/auth/login` — حقل email فقط
- `/auth/verify` — 6 خانات OTP + countdown + resend
- إزالة password forms الحالية (مع الاحتفاظ بالكود كـ legacy)

**أمان:**
- codes hashed (SHA-256)
- max 5 محاولات
- session آمنة عبر Supabase JWT (httpOnly cookies حيث ممكن)
- كل login يُسجّل في audit log

---

## المرحلة 3 — Email Abstraction Layer

```
src/lib/email/
  ├─ types.ts            # EmailProvider interface
  ├─ index.ts            # getProvider() — يقرأ EMAIL_PROVIDER env
  ├─ providers/
  │   ├─ lovable.ts      # default (Lovable Email)
  │   ├─ resend.ts
  │   ├─ smtp.ts
  │   ├─ mailgun.ts
  │   └─ ses.ts
  └─ templates/
      ├─ otp-code.tsx
      └─ welcome.tsx
```

**Interface موحد:**
```ts
interface EmailProvider {
  send(opts: { to, subject, html, text? }): Promise<{ id: string }>
}
```

التبديل بمتغير `EMAIL_PROVIDER` فقط، بدون لمس بقية الكود.

---

## المرحلة 4 — UI احترافي عالمي

- **Dark/Light mode** عبر `next-themes` + toggle في Topbar
- **Responsive كامل:** sidebar يتحول لـ sheet على mobile، tables بـ horizontal scroll، grid layouts متجاوبة
- **Loading skeletons** لكل صفحة بدل spinners
- **Optimistic updates** عبر TanStack Query mutations
- **Animations** عبر `framer-motion` (page transitions, list items stagger)
- **تصميم enterprise** مستوحى من Supabase/Neon: typography محكم، spacing منتظم، subtle borders، monospace للـ IDs/keys

---

## ما لن يتم تغييره
- الجداول الحالية (tenants, workspaces, db_tables, db_records, api_keys...) تبقى كما هي
- routes الحالية تُحدّث فقط (نصوص → i18n) ولا تُحذف
- التصميم الحالي يُحسّن لا يُعاد بناؤه

---

## ترتيب التنفيذ المقترح
1. i18n infrastructure + locales/en + locales/ar (الأساس)
2. ترجمة dashboard pages واحدة تلو الأخرى + إضافة fr, es
3. OTP auth (migration + server functions + UI)
4. Email abstraction layer
5. Dark mode + responsive polish + skeletons + animations

**هل تريد أن أبدأ بالمرحلة 1 (i18n) الآن؟ أم تفضل ترتيبًا مختلفًا؟** سأنفذها مرحلة بمرحلة وأقدم تقريرًا عربيًا بعد كل مرحلة.