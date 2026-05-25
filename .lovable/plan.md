# خطة تطوير DB-GUARD كمنصة قواعد بيانات متعددة المستأجرين

## نظرة عامة
بناء نظام multi-tenant فوق قاعدة البيانات الحالية مع الحفاظ على التصميم والكود الموجود، وإضافة طبقة عزل كاملة بين العملاء.

## المرحلة 1 — البنية التحتية للقاعدة (Migration)

### جداول النظام (system tables) في schema `public`:
- `tenants` — كل عميل = tenant واحد (id, name, slug, plan, owner_user_id, created_at)
- `workspaces` — مساحة عمل لكل tenant (قد تكون متعددة)
- `projects` — مشاريع داخل workspace
- `tenant_members` — أعضاء الفريق + الأدوار (owner/admin/editor/viewer)
- `app_role` enum — owner, admin, editor, viewer
- `user_tenant_roles` — جدول الأدوار (security definer pattern)
- `tenant_tables` — تعريف الجداول الديناميكية لكل tenant
- `tenant_columns` — أعمدة الجداول الديناميكية
- `tenant_records` — السجلات (JSONB data) مع tenant_id + table_id
- `api_keys` — مفاتيح API مشفرة (hash) لكل tenant
- `audit_logs` — سجل كامل لكل العمليات
- `backups` — نسخ احتياطية metadata
- `plans` — تعريف الخطط (free / pro / enterprise) مع الحدود
- `tenant_usage` — استهلاك حالي (عدد الجداول، السجلات، التخزين)
- `tenant_files` — ملفات مرفوعة

### الأمان (RLS):
- تفعيل RLS على كل الجداول
- دالة `get_current_tenant_id()` — security definer تقرأ من JWT أو session
- دالة `has_tenant_role(tenant_id, role)` — security definer لتجنب recursion
- كل سياسة RLS تتحقق من tenant_id + الدور
- API keys تُخزّن كـ hash فقط، لا يُسترجع المفتاح بعد إنشائه

### Trigger التسجيل:
- `handle_new_user_tenant()` trigger على `auth.users` → ينشئ تلقائياً:
  - tenant
  - workspace افتراضي
  - project افتراضي
  - 8 جداول افتراضية (customers, users, orders, products, services, files, logs, settings) مع أعمدة نموذجية
  - عضوية owner للمستخدم
  - تعيين خطة free

## المرحلة 2 — Server Functions (TanStack)

`src/lib/`:
- `tenants.functions.ts` — getMyTenant, switchTenant
- `tables.functions.ts` — list/create/rename/delete + addColumn/dropColumn (مع منع حذف الجداول الأساسية)
- `records.functions.ts` — list/create/update/delete + بحث وفلترة + import/export CSV
- `api-keys.functions.ts` — create (يعرض المفتاح مرة واحدة)، list، revoke
- `logs.functions.ts` — قراءة audit logs
- `billing.functions.ts` — getPlans, getCurrentUsage, requestUpgrade
- `team.functions.ts` — invite/remove/changeRole
- `backups.functions.ts` — create/list/restore (snapshot لـ tenant_records)

كلها محمية بـ `requireSupabaseAuth` + التحقق من دور العضو في الـ tenant.

## المرحلة 3 — Server Routes (REST API للعملاء الخارجيين)

تحت `src/routes/api/v1/` — تستخدم API key بدل JWT:
- `POST /api/v1/tables`, `GET /api/v1/tables`
- `POST /api/v1/records`, `GET /api/v1/records`, `PATCH /api/v1/records/$id`, `DELETE /api/v1/records/$id`
- `GET /api/v1/logs`
- middleware يتحقق من API key hash، يستخرج tenant_id، ويفرض حدود الخطة

## المرحلة 4 — صفحات لوحة التحكم

تحت `src/routes/_authenticated/dashboard/`:
- `dashboard/index.tsx` — Overview (إحصائيات + استخدام الخطة)
- `dashboard/databases.tsx`
- `dashboard/tables/index.tsx` — قائمة الجداول
- `dashboard/tables/$tableId.tsx` — عارض/محرر السجلات (Records) داخل الجدول
- `dashboard/records.tsx` — بحث عام
- `dashboard/files.tsx`
- `dashboard/api-keys.tsx`
- `dashboard/backups.tsx`
- `dashboard/logs.tsx`
- `dashboard/team.tsx`
- `dashboard/billing.tsx` — صفحة Plans
- `dashboard/settings.tsx`

تخطيط مشترك (`dashboard.tsx`) فيه sidebar احترافي بلون DB-GUARD الحالي.

## المرحلة 5 — صفحة Plans العامة
`/plans` — عرض الخطط (Free / Pro / Enterprise) مع زر ترقية (يسجّل طلب فقط، الدفع مرحلة لاحقة).

## التصميم
- الحفاظ على نظام الألوان والـ design tokens الحالية في `src/styles.css`
- استخدام مكونات shadcn الموجودة
- Sidebar + Topbar احترافيين بطابع منصة قواعد بيانات (مونوسبيس للجداول، badges للأنواع)

## ما هو خارج النطاق الآن (سيُذكر في التقرير)
- الدفع الفعلي (Stripe/Paddle) — فقط طلبات ترقية
- Backups فعلي على مستوى Postgres — فقط snapshot منطقي للسجلات
- AI features — مؤجل بطلب المستخدم
- File storage فعلي — metadata فقط في البداية (يمكن إضافة Lovable Cloud Storage لاحقاً)

## الملاحظات التقنية
- **لا** نحذف أي كود حالي
- **لا** نلمس `src/integrations/supabase/*` (auto-generated)
- كل tenant معزول عبر `tenant_id` + RLS — لا يوجد schema منفصل لكل عميل (نموذج shared schema)
- الجداول الديناميكية للعملاء تُخزَّن كـ JSONB في `tenant_records` لتجنب DDL في وقت التشغيل (آمن وقابل للتوسع)
- `tenant_columns` يحدد الـ schema للتحقق من أنواع البيانات قبل الكتابة

## التقرير النهائي
بعد التنفيذ سأقدم تقريراً عربياً يتضمن: الجداول المنشأة، الصفحات، الـ APIs، وما تبقى ناقصاً.

---

**هل أبدأ التنفيذ بهذه الخطة؟** المشروع كبير جداً وسأنفذه على دفعات (Migration أولاً → server functions → الصفحات).
