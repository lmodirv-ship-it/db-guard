# خطة: تجهيز نسخة مستقلة قابلة للتحميل

## الهدف
تحميل الموقع كاملاً كملف ZIP يعمل على أي سيرفر VPS بدون Neon / Supabase / Cloudflare.

## ما سأفعله بعد موافقتك

### 1. إضافة ملفات Docker للمشروع
- `Dockerfile` — يشغّل التطبيق بـ Node.js (بدل Cloudflare Workers)
- `docker-compose.yml` — يشغّل: التطبيق + Postgres + MinIO (للملفات) بأمر واحد
- `.env.docker.example` — كل المتغيرات المطلوبة بشرح عربي

### 2. إضافة طبقة توافق Postgres محلية
- ملف جديد `src/integrations/db/local-pg.server.ts` يستخدم `pg` بدل `@neondatabase/serverless`
- مفتاح تبديل عبر متغير بيئة: `DB_DRIVER=neon` أو `DB_DRIVER=local`
- **لن أكسر النسخة الحالية على Cloudflare** — ستبقى تعمل

### 3. سكريبت ترحيل البيانات
- `scripts/export-cloud-data.ts` — يصدّر بياناتك الحالية من Neon + Supabase إلى ملف SQL
- `scripts/import-local.ts` — يستوردها في Postgres المحلي

### 4. دليل عربي شامل
- `docs/SELF-HOSTING-AR.md`:
  - شراء سيرفر Hetzner (5€/شهر) خطوة بخطوة بالصور
  - تثبيت Docker
  - تشغيل `docker compose up -d`
  - ربط النطاق + SSL مجاني (Caddy)
  - النسخ الاحتياطي اليومي للقاعدة

### 5. تجميع كل شيء في ZIP
- `/mnt/documents/hn-bd-selfhosted.zip` يحتوي: كل الكود + Docker + الدليل + السكريبتات
- رابط تحميل مباشر في الشات

## ⚠️ ملاحظات مهمة

- **النطاق:** هذا تغيير كبير (~10-15 ملف جديد). سأنفّذه على دفعتين:
  - **الدفعة 1:** Docker + طبقة Postgres المحلية + الدليل + ZIP → تجربها وتعطيني رأيك
  - **الدفعة 2:** سكريبت الترحيل + استبدال Supabase Storage بـ MinIO (إذا كنت تستخدم ملفات)

- **التخزين السحابي (R2):** موقعك يستخدم Cloudflare R2 للملفات. في النسخة المستقلة سيُستبدل بـ MinIO (نفس API). إذا لم تكن ترفع ملفات حالياً، يمكن تأجيل هذا.

- **الإيميل:** Resend خارجي ويعمل من أي مكان — لن يحتاج تغيير. يمكن استبداله لاحقاً بـ SMTP عادي إذا أردت.

- **التكلفة بعد الترحيل:** ~5€/شهر فقط (سيرفر Hetzner CX22) بدل تكاليف Neon + Supabase + Cloudflare.

## السؤال قبل التنفيذ

هل توافق على البدء بـ **الدفعة 1** (Docker + Postgres محلي + دليل + ZIP للتحميل)؟ أم تريد تعديل شيء؟
