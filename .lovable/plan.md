
# بناء صفحة التسجيل الموحّدة (HN SSO)

## الهدف
صفحة `/signup` و `/login` على `hn-bd.online` تستقبل المستخدمين من أي موقع (`hn-db.fun`, Otobo, مواقع مستقبلية)، تسجّلهم في `hn_users`، ثم تُعيدهم إلى موقع المصدر **مسجّلين** عبر SSO ticket. كل البيانات تُحفظ مركزياً وتظهر في لوحة المالك.

## التصميم (مطابق للصورة المرفقة)
- خلفية داكنة `#0a0e1a` + شبكة ذهبية متوهجة (gradient + glow)
- اللون الذهبي الأساسي: `#f5b800` / `#ffd54a` (gradient)
- خطوط: **Cairo** للعربية + **Outfit** للأرقام/اللاتيني
- عمود يسار: شعار HN + كرة أرضية + 6 أيقونات خدمات (HN Chat / Driver / Souk / Studio / Video AI / DB Guard)
- عمود يمين: بطاقة زجاجية (glassmorphism) فيها النموذج
- 4 بطاقات صغيرة أسفل اليسار: حساب آمن / دخول فوري / إشعارات / دعم 24/7
- شريط سفلي: "يمكنك استعمال هذا الحساب في جميع خدمات HN" + 6 أيقونات
- RTL كامل

## الحقول
الاسم الكامل · البريد الإلكتروني · رقم الهاتف (مع `+213` 🇩🇿) · كلمة المرور · تأكيد كلمة المرور · checkbox الشروط

## آلية SSO

```text
موقع المصدر (hn-db.fun)
   ↓ زر "تسجيل" → window.location = "https://hn-bd.online/signup?app=hn-db-fun&redirect=https://hn-db.fun/dashboard"
صفحة /signup على hn-bd.online
   ↓ المستخدم يُكمل النموذج → INSERT في hn_users (password bcrypt) + hn_user_code تلقائي
   ↓ إصدار hn_sso_ticket صالح لـ 60 ثانية
   ↓ redirect إلى: https://hn-db.fun/dashboard?hn_ticket=<token>
موقع المصدر
   ↓ يستقبل ticket → يستدعي POST /api/public/sso/verify
   ↓ يستلم: { hn_user_code, full_name, email, session_token }
   ↓ يحفظ session_token في cookie ويعتبر المستخدم مسجّلاً
```

## الملفات المطلوب إنشاؤها

### Frontend (TanStack routes)
- `src/routes/signup.tsx` — صفحة التسجيل الموحدة (التصميم الذهبي/الأسود)
- `src/routes/login.tsx` — صفحة الدخول بنفس التصميم (تحديث الحالية)
- `src/components/hn/HnAuthLayout.tsx` — تخطيط مشترك (يسار: branding + خدمات / يمين: نموذج)
- `src/components/hn/HnServicesPanel.tsx` — لوحة الخدمات الست
- `src/components/hn/HnFormCard.tsx` — البطاقة الزجاجية للنموذج
- `src/components/hn/PhoneInput.tsx` — حقل الهاتف مع علم الجزائر +213
- `src/lib/hn-sso.functions.ts` — server functions

### Backend (Server Functions + Public API)
- `signupHnUser` (createServerFn): تحقق Zod → bcrypt password → insert `hn_users` → توليد `hn_user_code` (HN000001) → إنشاء `hn_workspace` افتراضي → إصدار `hn_sso_ticket` → إرجاع `redirect_url + ticket`
- `loginHnUser` (createServerFn): تحقق email/password → إصدار ticket
- `src/routes/api/public/sso/verify.ts` (server route): POST يستقبل `{ ticket, app_key }` → يتحقق من `connected_apps` (CORS) → يستهلك التذكرة (`used_at`) → ينشئ `hn_sessions` ويرجع `{ hn_user_code, full_name, email, session_token, expires_at }`
- `src/routes/api/public/sso/me.ts`: GET للتحقق من `session_token` (Bearer)

### قاعدة البيانات (الجداول موجودة، لا migration جديدة)
- استخدام `hn_users` + `hn_sessions` + `hn_sso_tickets` + `connected_apps` + `hn_workspaces`
- إضافة سياسة DB function `generate_hn_user_code()` لتوليد HN000001 تسلسلياً (لو غير موجودة)

### لوحة المالك (موجودة سابقاً)
- التأكد أن صفحة Owner تعرض `hn_users` الجديدة مع `source_app` (الموقع الذي جاء منه)

## التكامل مع المواقع الأخرى
في كل موقع، استبدال أزرار "تسجيل/دخول" بـ:
```html
<a href="https://hn-bd.online/signup?app=hn-db-fun&redirect=https://hn-db.fun/">إنشاء حساب</a>
<a href="https://hn-bd.online/login?app=hn-db-fun&redirect=https://hn-db.fun/">تسجيل الدخول</a>
```
وإضافة سكريبت صغير `hn-sso-client.js` (سأضعه في `hn-db-fun-site.zip`) يلتقط `?hn_ticket=` ويستدعي `/api/public/sso/verify` ثم يحفظ الـ session.

## ملاحظات أمنية
- `password_hash` بـ bcrypt (cost 10) — لن يُعرض في أي API
- التذكرة صالحة 60 ثانية، تُستهلك مرة واحدة (`used_at`)
- session token = SHA-256 مخزّن في `hn_sessions.token_hash`، الأصل يُرسل للعميل فقط مرة واحدة
- التحقق من `connected_apps.allowed_redirect_hosts` قبل أي redirect (منع open-redirect)
- Rate limit على signup/login (5 محاولات / 15 دقيقة)
- Zod validation صارم على كل المدخلات

## الترتيب
1. مكونات التصميم (Layout + ServicesPanel + FormCard + PhoneInput)
2. صفحة `/signup` بالتصميم الكامل
3. تحديث `/login` بنفس التصميم
4. server functions (`signupHnUser`, `loginHnUser`)
5. server routes العامة (`/api/public/sso/verify`, `/me`)
6. تحديث `hn-db-fun-site` لاستخدام روابط SSO + سكريبت العميل
7. اختبار الدورة كاملة من `hn-db.fun` → `hn-bd.online/signup` → عودة مسجّل

## ما لن أغيّره
- جداول قاعدة البيانات (موجودة وكافية)
- لوحة المالك الحالية (ستعرض المستخدمين الجدد تلقائياً)
- تطبيق DB·GUARD الرئيسي
