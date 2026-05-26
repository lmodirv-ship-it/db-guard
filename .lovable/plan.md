
## المشكلة

1. `<html lang="en">` ثابت في `__root.tsx` بدون `dir` → لا يوجد اتجاه على مستوى الـ document في SSR.
2. `I18nProvider` ينتظر hydration ثم يطبّق اللغة المخزّنة في `localStorage` عبر `applyDocumentLanguage` → اتجاه الصفحة يتبدّل بعد التحميل (layout shift + sidebar يقفز يمين/يسار).
3. `DashboardShell` يستعمل `start-0` / `border-e` (logical properties) — صحيح، لكن لأن `dir` يتغير بعد hydration الـ sidebar ينتقل من يسار إلى يمين بشكل مرئي.
4. لا يوجد cookie لحفظ اللغة على السيرفر → SSR لا يعرف لغة المستخدم.

## الحل

### 1) حفظ اللغة في cookie (مقروء على السيرفر)
- تعديل `src/lib/i18n/index.ts`: `setStoredLanguage` يكتب أيضاً cookie `dbguard-lang` (Path=/, 1 سنة, SameSite=Lax).
- `getStoredLanguage` يقرأ من cookie أولاً ثم localStorage (للتوافق).

### 2) قراءة اللغة في SSR وتطبيقها على `<html>`
- في `src/routes/__root.tsx`:
  - استعمال `createServerFn` أو قراءة الـ request headers في `beforeLoad` لاستخراج cookie `dbguard-lang`.
  - تمريرها كـ loader data للـ root.
  - في `RootShell` ضبط `<html lang={lang} dir={dir}>` بناءً على القيمة (افتراضي `en`/`ltr`).
- هذا يضمن أن أول render (SSR) يحمل الاتجاه الصحيح → لا يوجد flash.

### 3) إزالة الـ flicker في `I18nProvider`
- بدل الانتظار حتى `useEffect`, قراءة اللغة من `document.documentElement.lang` (التي تم ضبطها في SSR) كقيمة أولية لـ i18n.
- استدعاء `i18n.changeLanguage(lang)` مرة واحدة قبل أول render على العميل (في module init أو via `useState` initializer) بحيث تتطابق مع SSR.
- إزالة `applyDocumentLanguage` من `languageChanged` handler عند SSR-match، والإبقاء عليها فقط عند تغيير المستخدم اللغة يدوياً.

### 4) تثبيت الـ sidebar في `DashboardShell`
- الكود حالياً يستعمل `start-0`, `border-e`, `inset-y-0 start-0` → هذه logical properties تتبع `dir` تلقائياً. بمجرد أن يصبح `dir` ثابتاً من SSR، الـ sidebar لن يقفز.
- التأكد من أن جميع المواضع تستعمل logical (`start/end`, `ms/me`, `ps/pe`, `border-s/border-e`) — مراجعة سريعة للملف، استبدال أي `left/right` متبقي.

### 5) تثبيت responsive
- `<aside className="hidden lg:flex w-64 shrink-0 border-e ...">` يبقى كما هو.
- الموبايل drawer: `fixed inset-y-0 start-0` صحيح مع `dir` ثابت.
- لا تغيير في breakpoints.

### 6) منع hydration mismatch إضافي
- `LanguageSwitcher`: حالياً يستعمل `mounted` flag — يبقى.
- إزالة أي `Math.random()` أو `Date.now()` من initial render (خارج نطاق هذا الطلب لكن مذكور سابقاً).

## الملفات المتأثرة

- `src/lib/i18n/index.ts` — إضافة cookie read/write helpers.
- `src/routes/__root.tsx` — قراءة cookie في SSR، تمرير `lang`/`dir` إلى `<html>`.
- `src/components/I18nProvider.tsx` — مزامنة i18n مع SSR lang بدون flicker.
- `src/components/dashboard/DashboardShell.tsx` — مراجعة سريعة لأي `left/right` (لا تغييرات هيكلية).

## ما لن أفعله

- لن أمسّ أي ملف auth/database/route آخر.
- لن أعيد ترتيب navigation items.
- لن أغيّر التصميم أو الألوان.
- لا mock data، لا تغييرات في business logic.

## النتيجة المتوقعة

- العربية: `<html lang="ar" dir="rtl">` من SSR → sidebar يميناً ثابتاً.
- الإنجليزية/الفرنسية/الإسبانية: `<html lang="xx" dir="ltr">` → sidebar يساراً ثابتاً.
- لا قفزة layout بعد hydration.
- تبديل اللغة يدوياً يطبّق فوراً ويُحفظ في cookie للزيارات القادمة.
