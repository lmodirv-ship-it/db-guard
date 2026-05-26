## الهدف

تمكين تطبيقات خارجية (مثل HN-Build) من الاتصال بـ DB·GUARD عبر:

```
Authorization: Bearer dbg_xxxxxxxxxxxxxx
```

بدون الحاجة لـ session cookie.

---

## ما سيتم بناؤه

### 1) Middleware موحّد للمصادقة المزدوجة

ملف جديد: `src/lib/auth/api-auth.server.ts`

دالة `requireAuth(request)` تجرّب بالترتيب:
1. إذا وُجد header `Authorization: Bearer dbg_...` → تحسب SHA-256 وتطابقها مع `api_keys.key_hash` (في DB Neon، جدول النظام، ليس Supabase). ترجع `{ tid, sub: 'api-key:<id>', email, via: 'api_key' }`.
2. وإلا → fallback إلى `requireSession(request)` (الكوكي الحالي).

سيستبدل `requireSession` في كل endpoints الجداول/السجلات/الأعمدة.

### 2) تحديث endpoints

استبدال `requireSession` بـ `requireAuth` في:
- `src/routes/api/tables/index.ts`
- `src/routes/api/tables/$id.ts`
- `src/routes/api/tables/$id/columns.ts`
- `src/routes/api/tables/$id/records.ts`
- `src/routes/api/records/$id.ts`
- `src/routes/api/billing/usage.ts`

الـ endpoints الخاصة بإدارة API Keys نفسها (`/api/api-keys`) تبقى محمية بـ session cookie فقط (لمنع إنشاء مفاتيح عبر مفتاح).

### 3) تحديث جدول `api_keys` (تتبّع آخر استخدام)

إضافة عمودين:
- `last_used_at TIMESTAMPTZ`
- `last_used_ip TEXT`

(يُحدَّثان async داخل middleware بدون إبطاء الطلب).

### 4) صفحة Docs بسيطة `/dashboard/docs`

تعرض:
- Base URL: `https://www.hn-bd.online/api`
- طريقة المصادقة + مثال curl
- قائمة endpoints مع شكل JSON response
- زر "Copy curl" لكل endpoint

### 5) تحسين صفحة `/dashboard/api-keys`

- إظهار آخر استخدام (`last_used_at`) و IP.
- تنبيه واضح: "المفتاح يُعرض مرة واحدة فقط — احفظه الآن".

---

## نموذج الاستعمال من HN-Build (بعد التنفيذ)

```ts
const r = await fetch("https://www.hn-bd.online/api/tables", {
  headers: { Authorization: `Bearer ${process.env.DBGUARD_API_KEY}` },
});
const { tables } = await r.json();
```

---

## تفاصيل تقنية

- مكان جدول `api_keys`: **Neon DB** (HN_DB_URL) — ليس Supabase. الـ schema الموجود في `migrations/0006_db_platform.sql` يحتوي: `id, tenant_id, user_id, name, key_hash, key_prefix, scopes, created_at, revoked_at, last_used_at`.
- التحقق: SHA-256 hex على المفتاح الكامل ثم مقارنة constant-time مع `key_hash` حيث `revoked_at IS NULL`.
- في حالة عدم وجود `tenant_id` أو مفتاح مُلغى → 401 `invalid_api_key`.
- الـ scopes الحالية (`read`, `write`, `admin`) **لن تُفرض في هذه الخطوة** (مستقبلاً).
- لا تغيير في تصميم UI الحالي، فقط إضافة صفحة Docs.
- لن نلمس Supabase schema — جدول `api_keys` المعروض في الـ schema الأعلى ليس هو المستعمل؛ المستعمل هو في Neon.

---

## خارج النطاق

- Rate limiting (يأتي لاحقاً).
- فرض الـ scopes (read/write/admin).
- OAuth2 / refresh tokens.
- SDK رسمي npm لـ DB·GUARD.

---

## التقرير النهائي بعد التنفيذ

سأقدّم باللغة العربية:
- الملفات الجديدة/المعدّلة.
- نص curl جاهز للنسخ لـ HN-Build.
- خطوات إنشاء أول API Key من `/dashboard/api-keys`.

هل أبدأ التنفيذ؟
