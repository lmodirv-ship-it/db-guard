# الخطة الكاملة لمشروع HNBase — Build-Only

## القرارات النهائية المعتمدة (مغلقة، لا تعديل)
| البند | القرار |
|---|---|
| Runtime | Cloudflare Workers (داخل Lovable) |
| DB Provider | Neon (`@neondatabase/serverless` HTTP) |
| Email | Resend HTTP API |
| Password Hashing | PBKDF2 / SHA-256 / 600k iters عبر `crypto.subtle` |
| JWT | `jose` HS256، يُحفظ في **httpOnly cookie** |
| Tenant Isolation | **دفاع بطبقتين**: Application WHERE + Postgres RLS مع `SET LOCAL app.tenant_id` داخل transaction |
| Supabase | ❌ ممنوع نهائياً (لا SDK، لا Auth، لا أي import) |
| طريقة العمل | مرحلة بمرحلة، توقف وتقرير بعد كل مرحلة |
| الأسرار | لن تُضاف الآن. Build-Only. أنت تضعها على سيرفرك. |

## الأسرار الخمسة المعتمدة (في `.env.example` فقط)
```
HN_DB_URL              # Neon HTTP connection string (لـ runtime)
HN_DB_DIRECT_URL       # Neon direct connection (لـ migrations فقط)
HN_JWT_SECRET          # ≥ 32 حرف عشوائي
RESEND_API_KEY         # مفتاح Resend
HN_MAIL_FROM           # عنوان المُرسل المُتحقق منه
```

---

## خريطة المراحل العشر

| # | المرحلة | الحالة |
|---|---|---|
| 0–1 | البنية + الاتصال + `/api/health` | **التالي ← أنفذ الآن وأتوقف** |
| 2 | SQL Migrations (users, tenants, roles, projects, records, jobs, storage_events, RLS, indexes) | بعد موافقتك على تقرير 0–1 |
| 3 | Auth: signup/login/logout/forgot/reset + JWT cookie + بريد Resend | لاحقاً |
| 4 | Tenant Middleware + `withTenantTx` helper + Zod guards (تجاهل tenant_id من body) | لاحقاً |
| 5 | UI الكامل (RTL، Cairo، نظام التصميم من الصورة): Landing + Auth + Dashboard + Records | لاحقاً |
| 6 | Site Verification (meta/DNS TXT/file) + Smart Project Generator | لاحقاً |
| 7 | Pipeline + Job Queue (queued/running/success/failed) + 10 مواقع متوازية + Object Storage | لاحقاً |
| 8 | لوحة تحكم كاملة (CRUD، فلاتر، تقارير، سجل نشاط) | لاحقاً |
| 9 | Tests (وحدة + E2E + اختبار عزل: User A ≠ User B) + DEPLOY.md + CHECKLIST.md + SECURITY.md | لاحقاً |

---

# 🎯 المرحلة 0–1 (التنفيذ الفوري)

## الهدف
تأسيس البنية + التحقق من الأسرار + اتصال Neon + endpoint `/api/health` يعمل.

## ما سيُنشأ — 5 ملفات

### 1. `src/lib/env.server.ts`
- `REQUIRED_ENV_KEYS` = الخمسة فقط.
- `checkEnv()` → `{ ok, missing[], present[] }` بدون كشف القيم.
- `requireEnv(key)` → يرمي خطأ واضح عند الغياب.
- `getDbHost()` → يستخرج hostname فقط (آمن للعرض).

### 2. `src/lib/db/client.server.ts`
- `getSql()` — singleton Neon HTTP client (lazy init).
- `withTransaction(fn)` — wrapper لـ Neon transactions (سيُستخدم في مرحلة 4 لـ `SET LOCAL app.tenant_id`).
- `pingDb()` — `select 1`، يُرجع `{ ok, latency_ms, error? }` مع تعقيم رسائل الخطأ (يحجب أي connection string).

### 3. `src/lib/auth/password.server.ts`
- `hashPassword(pw)` و `verifyPassword(pw, stored)`.
- صيغة: `pbkdf2$sha256$600000$<salt_b64>$<hash_b64>`.
- مقارنة constant-time.
- **يُجهَّز فقط، لن يُستخدم في 0–1.**

### 4. `src/lib/auth/jwt.server.ts`
- `signJwt(payload, ttl)` و `verifyJwt(token)` عبر `jose` HS256.
- payload: `{ sub, email, tenant_id, role }`.
- يفحص `HN_JWT_SECRET` ≥ 32 حرف.
- **يُجهَّز فقط، لن يُستخدم في 0–1.**

### 5. `src/routes/api/health.ts`
- `GET /api/health`
- يفحص ENV → يفحص DB (إن أمكن) → JSON منظم.
- HTTP 200 عند النجاح الكامل، 503 عند أي فشل.
- `Cache-Control: no-store`.

## شكل الاستجابة المتوقعة

**حالياً (لا أسرار) — HTTP 503:**
```json
{
  "status": "fail",
  "checks": {
    "env": { "status": "fail", "missing": ["HN_DB_URL", "HN_DB_DIRECT_URL", "HN_JWT_SECRET", "RESEND_API_KEY", "HN_MAIL_FROM"] },
    "db": { "status": "skipped", "reason": "env_missing" }
  },
  "db_host": null,
  "stack": "tanstack-start + cloudflare-workers",
  "provider": { "db": "neon", "email": "resend" },
  "supabase": false,
  "timestamp": "..."
}
```

**عندما تضع الأسرار على سيرفرك — HTTP 200:**
```json
{
  "status": "ok",
  "checks": {
    "env": { "status": "ok", "missing": [] },
    "db": { "status": "ok", "latency_ms": 42 }
  },
  "db_host": "ep-xxx.neon.tech",
  ...
}
```

## ضمانات الأمان والقيود
- ✅ كل الملفات `.server.ts` → محظورة من client bundle بقواعد TanStack.
- ✅ لا قيمة سر تُسرَّب أبداً (فقط أسماء + hostname).
- ✅ رسائل خطأ DB مُعقّمة (regex يحجب أي `postgres://...`).
- ❌ صفر imports من `@supabase/*`.
- ❌ صفر اتصال داخلي.
- ❌ لا تعديل على `index.tsx` أو `__root.tsx` (تأتي في المرحلة 5).
- ❌ لا migrations، لا UI، لا endpoints أخرى.

## التقرير بعد التنفيذ
1. **الملفات المُنشأة** (5 + `package.json` معدّل بـ Neon و jose).
2. **نتيجة `/api/health` فعلية** (سأستدعيها عبر `invoke-server-function` وأعرض الـ JSON الكامل + HTTP status).
3. **تأكيد بأرقام:**
   - `grep -r "@supabase" src/` → 0 نتائج.
   - imports من `@neondatabase/serverless` → 1.
   - imports من `jose` → 1.
4. ✋ **توقف كامل** بانتظار موافقتك على المرحلة 2.

---

## بعد المرحلة 0–1، المرحلة 2 ستكون: SQL Migrations

سأبني `migrations/` بهذا الشكل (ليس الآن، فقط للسياق):
```
migrations/
├── 0001_extensions.sql       # pgcrypto, citext
├── 0002_roles.sql            # CREATE ROLE app_tenant
├── 0003_users.sql            # users + email unique
├── 0004_tenants.sql          # tenants + storage_root + status
├── 0005_user_roles.sql       # super_admin/admin/user
├── 0006_projects.sql         # smart project generator
├── 0007_site_verifications.sql  # meta/DNS/file methods
├── 0008_records.sql          # tenant-scoped data (مثال الصورة)
├── 0009_jobs.sql             # queued/running/success/failed
├── 0010_storage_events.sql   # provisioning logs
├── 0011_indexes.sql          # tenant_id, project_id, created_at
├── 0012_rls_enable.sql       # ENABLE RLS على كل tenant-scoped table
├── 0013_rls_policies.sql     # USING (tenant_id = current_setting('app.tenant_id')::uuid)
└── 0014_grants.sql           # GRANT للـ app_tenant فقط، REVOKE من PUBLIC
```

---

## هل توافق على البدء بالمرحلة 0–1 الآن؟

أجب بـ **"ابدأ"** وسأنفذ فوراً، أو قل ما تريد تعديله في الخطة.
