## نظرة عامة

تنفيذ **المرحلة 0 (تهيئة المشروع)** و**المرحلة 1 (الاتصال بقاعدة البيانات الخارجية)** فقط، ثم التوقف لانتظار موافقتك قبل أي مرحلة لاحقة (Auth، RLS، الواجهات، الجداول... كلها مؤجَّلة).

القيود الإلزامية المطبَّقة:
- لا اتصال بأي قاعدة بيانات غير `EXTERNAL_HN_BASE_*`.
- المفاتيح الحساسة (`SERVICE_ROLE_KEY`, `DB_URL`) **داخل Server Functions فقط** — لا تصل أبدًا للمتصفح.
- إذا أي secret ناقص → التشغيل يتوقف برسالة عربية واضحة.
- لا Auth، لا جداول، لا CRUD، لا UI تطبيقي في هذه المرحلة.

---

## ما سيتم إنشاؤه

### 1) هيكل `src/modules` (Production-ready)

```text
src/
├── modules/
│   ├── core/
│   │   ├── env/
│   │   │   ├── env.server.ts       # تحميل + تحقق صارم لمتغيرات EXTERNAL_HN_BASE_*
│   │   │   └── env.schema.ts       # Zod schema للمتغيرات الإلزامية
│   │   └── i18n/
│   │       ├── config.ts           # قائمة اللغات: ar, en, fr, es + الافتراضي + اتجاه RTL/LTR
│   │       ├── locales/
│   │       │   ├── ar.json         # مفاتيح أساسية فقط (app.title, health.*)
│   │       │   ├── en.json
│   │       │   ├── fr.json
│   │       │   └── es.json
│   │       └── index.ts            # init i18next + react-i18next
│   ├── database/
│   │   ├── client.browser.ts       # عميل Supabase للمتصفح (anon key فقط، عبر VITE_*)
│   │   ├── client.server.ts        # عميل Supabase للسيرفر (service role، process.env فقط)
│   │   └── health.server.ts        # دالة فحص اتصال (SELECT 1 / auth.getSession)
│   └── shared/
│       └── types/
│           └── database.ts         # placeholder لأنواع الـ DB (تُولَّد لاحقًا)
├── routes/
│   ├── __root.tsx                  # تحديث: تهيئة i18n + ضبط lang/dir ديناميكيًا
│   ├── index.tsx                   # صفحة هبوط مؤقتة بسيطة (تستبدل الـ placeholder)
│   └── health.tsx                  # صفحة /health: تستدعي server fn لفحص الاتصال
└── styles.css                      # دعم RTL أساسي
```

### 2) طبقة env (تحقق إلزامي)

`src/modules/core/env/env.schema.ts`: Zod schema يتطلب:
- `EXTERNAL_HN_BASE_URL` (URL صالح)
- `EXTERNAL_HN_BASE_ANON_KEY` (string غير فارغ)
- `EXTERNAL_HN_BASE_SERVICE_ROLE_KEY` (string غير فارغ، **server-only**)
- `EXTERNAL_HN_BASE_DB_URL` (string غير فارغ، **server-only**)

`env.server.ts`:
- يقرأ من `process.env` ويُمرّر عبر `safeParse`.
- عند الفشل: يُرمى `Error` برسالة عربية تُعدّد المفاتيح الناقصة بدقة، فتظهر في error boundary لـ `/health`.
- يُستخدم حصريًا داخل ملفات `*.server.ts` و server functions.

للمتصفح: `EXTERNAL_HN_BASE_URL` و`ANON_KEY` تُمرَّر عبر متغيرات `VITE_*` منفصلة (تُضاف لاحقًا عند الحاجة في مرحلة Auth). في هذه المرحلة، المتصفح **لا يصل** لأي شيء من قاعدة البيانات.

### 3) عملاء Supabase

- **`client.server.ts`**: يستخدم `service_role_key` + `db_url`. يُستدعى فقط من Server Functions. ملف بامتداد `.server.ts` ليرفض bundler الـ client تضمينه.
- **`client.browser.ts`**: هيكل جاهز فقط (placeholder export). لن يُستخدم قبل مرحلة Auth.

### 4) صفحة `/health` للتحقق

- Server function `checkDatabaseHealth()` تستدعي `client.server.ts` وتُرجع:
  - حالة env (جميع المتغيرات موجودة؟)
  - حالة الاتصال (نجح/فشل + زمن الاستجابة بالميلي ثانية)
  - رسالة الخطأ إن وُجدت
- الواجهة: بطاقة بسيطة بأربعة مؤشرات (env, url reachable, auth endpoint, db query) — أخضر/أحمر، بالعربية افتراضيًا مع زر تبديل اللغة.

### 5) i18n (قابل للتوسعة، 4 لغات الآن)

- مكتبة: `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- اللغات: `ar` (افتراضي، RTL)، `en`، `fr`، `es` (LTR).
- ملفات الترجمة في هذه المرحلة تحتوي فقط على مفاتيح: `app.title`, `health.title`, `health.envOk`, `health.envMissing`, `health.dbOk`, `health.dbFail`, `common.retry`, `common.language`.
- `__root.tsx` يضبط `<html lang dir>` بناءً على اللغة النشطة.

### 6) صفحة الهبوط `/`

استبدال الـ placeholder الحالي بصفحة بسيطة جدًا تعرض اسم المشروع + رابط لـ `/health` فقط. لا UI تطبيقي.

### 7) الأسرار

سأطلب منك إضافة الأسرار الأربعة عبر أداة الأسرار في Lovable Cloud:
- `EXTERNAL_HN_BASE_URL`
- `EXTERNAL_HN_BASE_ANON_KEY`
- `EXTERNAL_HN_BASE_SERVICE_ROLE_KEY`
- `EXTERNAL_HN_BASE_DB_URL`

(لا يلزم تعطيل Lovable Cloud — سنتجاهله ونعتمد فقط على هذه الأسرار. أي عميل Supabase داخلي افتراضي سيُحذف/يُتجاهل.)

---

## التحقق بعد التنفيذ

1. شجرة الملفات النهائية.
2. قائمة الملفات المُنشأة/المعدَّلة.
3. زيارة `/health` تعرض حالة الاتصال (أخضر إذا كل الأسرار صحيحة، أحمر مع تفاصيل الخطأ خلاف ذلك).
4. تجربة حذف أحد الأسرار → يجب أن يتوقف `/health` ويُظهر اسم المتغير الناقص بالعربية.
5. تقرير مختصر بما تم.

---

## ما هو **خارج** هذه المرحلة (سيُؤجَّل)

- المرحلة 2: Migrations (`profiles`, `organizations`, ...).
- المرحلة 3: Auth.
- المراحل 4–10: الأدوار، RLS، DAL، CRUD، Audit، الاختبارات، الإطلاق.

سأتوقف بعد إنجاز المرحلتين 0+1 وأطلب موافقتك صراحة قبل بدء المرحلة 2.
