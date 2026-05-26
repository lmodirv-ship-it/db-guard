## الهدف

إنشاء ملف `index.html` ثابت (Standalone) مطابق بصريًا للصفحة الرئيسية الحالية على Lovable (`hn-bd.online`)، يمكنك تحميله ورفعه عبر FTP إلى استضافة LWS واستعماله على نطاق آخر، مع بقاء DB·GUARD على Lovable كما هو.

## المخطط النهائي

```text
hn-bd.online            → استضافة LWS (index.html ثابت — الواجهة التعريفية)
app.hn-bd.online        → Lovable (DB·GUARD — لوحة التحكم الكاملة)
otobo.hn-bd.online      → VPS Otobo (تذاكر الدعم — تربطه أنت من LWS DNS)
```

كل نطاق يعمل بشكل مستقل تمامًا.

## ما سأقوم بإنشائه

1. **`/mnt/documents/index.html`** — صفحة HTML واحدة مكتفية بذاتها:
   - بدون React، بدون build، بدون npm.
   - نفس التصميم الحالي: Hero + Features + Dashboard preview + Pricing + CTA + Footer.
   - CSS مُضمَّن داخل `<style>` (يحاكي ألوان Tailwind/oklch والـ gradient والـ glass والـ glow).
   - أيقونات Lucide كـ SVG مُضمَّنة (بدون CDN).
   - شعار DB·GUARD كصورة مرفقة منفصلة (`db-guard-logo.jpg`).
   - meta tags كاملة (SEO + OG).
   - أزرار "Get Started" و "Sign In" و "Dashboard" تشير إلى `https://app.hn-bd.online/...` (DB·GUARD على Lovable).
   - رابط "Support" يشير إلى `https://otobo.hn-bd.online` (Otobo على VPS).

2. **`/mnt/documents/db-guard-logo.jpg`** — نسخة من الشعار الحالي.

3. **`/mnt/documents/README-deploy.txt`** — تعليمات مختصرة بالعربية:
   - كيفية الرفع عبر FTP إلى `public_html/` في LWS.
   - إعدادات DNS المطلوبة لكل نطاق (A records للنطاق الرئيسي على LWS، CNAME لـ `app` على Lovable، A لـ `otobo` على VPS).

## ما لن يتغير في المشروع الحالي

- **لا تعديل** على أي ملف من DB·GUARD (لا `src/routes/`، لا `src/components/`).
- **لا migration** لقاعدة البيانات.
- المشروع الحالي على Lovable يبقى يعمل كما هو على `app.hn-bd.online`.

## الملفات الناتجة

ستظهر لك بعد التنفيذ كـ artifacts قابلة للتنزيل:
- `index.html`
- `db-guard-logo.jpg`
- `README-deploy.txt`

## ما يبقى على عاتقك

- ضبط DNS في لوحة LWS: نقل النطاق الرئيسي إلى استضافة LWS، وإضافة CNAME لـ `app` يشير إلى Lovable، و A record لـ `otobo` يشير إلى IP الـ VPS.
- نقل النطاق الأساسي من Lovable إلى LWS (سأشرح ذلك في README).

هل أبدأ التنفيذ؟
