# HN Unified Identity System

تحويل DB-GUARD ليكون **Identity Provider مركزي (IdP)** لجميع تطبيقات HN (Chat, Groupe, Driver, Souk…) مع SSO حقيقي وتسجيل دخول موحّد.

## 1. قاعدة البيانات (migration واحدة)

### جداول جديدة
- `registered_users` (View موحّد فوق `hn_users` يضيف: `source_app`, `registration_source`, `plan`, `last_login`, `status`)  
  → سنضيف الأعمدة الناقصة لـ `hn_users`: `plan text default 'free'`, `last_login_at timestamptz`, `status text default 'active'`, `registration_source text`.
- `hn_sso_tickets` — تذاكر SSO قصيرة العمر (60s) لتمرير الجلسة بين المواقع:  
  `id, ticket_hash, user_id, hn_user_code, source_app, target_app, redirect_url, used_at, expires_at, created_at`.
- `hn_active_sessions` — توسيع `hn_sessions` بـ: `device, user_agent, ip_address, last_active_at, revoked_at`.
- `password_reset_tokens` — `id, user_id, token_hash, channel ('email'|'otp'), code_hash, expires_at, used_at, ip, user_agent`.
- `password_reset_logs` — `id, user_id, email, action ('requested'|'verified'|'completed'|'failed'), ip, user_agent, metadata, created_at`.
- `connected_apps` — قائمة المواقع المسموح لها (Chat, Groupe, Driver, Souk):  
  `id, app_key, name, allowed_redirect_hosts text[], status, created_at`. (seed أولي).

كل الجداول RLS: قراءة المستخدم لبياناته فقط + service_role كامل.

## 2. Server Functions (مركزية في DB-GUARD)

تحت `src/lib/identity/`:

- `sso.functions.ts`
  - `issueSsoTicket({ target_app, redirect_url })` — يصدر ticket لمستخدم مسجّل ويعيد URL.
  - `consumeSsoTicket({ ticket })` — تستهلكه التطبيقات الأخرى → يرجع user payload + JWT موقّع بـ `HN_JWT_SECRET`.
- `sessions.functions.ts`
  - `listMySessions`, `revokeSession`, `revokeAllOtherSessions`.
- `password-reset.functions.ts`
  - `requestPasswordReset({ identifier })` — يقبل email أو `HN-XXXXXX`.
  - `verifyResetCode({ token, code })`
  - `completeReset({ token, newPassword })`
- `owner.functions.ts` (Owner-only)
  - `listAllRegisteredUsers({ filters })` — مع source_app, plan, status, last_login.

كل التسجيلات الموجودة (`register.functions.ts`) ستُعدَّل لتقبل `source_app` (chat|groupe|driver|souk|dbguard) وتعبّئ `registration_source`.

## 3. Routes جديدة

- `/forgot-password` — إدخال email أو HN code.
- `/reset-password` — إدخال OTP + كلمة مرور جديدة.
- `/sso/authorize` — يستقبل `?app=chat&redirect=https://...` → إن كان المستخدم مسجلًا يُصدر ticket ويعيد التوجيه؛ وإلا يحوّل لـ `/login` ثم يعود.
- `/sso/callback` — endpoint يستهلكه التطبيقات الأخرى (`/api/public/sso/verify` server route لتحقق التذكرة + إصدار JWT).
- `/owner/registered-users` — Owner Dashboard لعرض جميع المستخدمين (يتطلب صلاحية owner — سنستخدم `user_roles` مع `app_role='owner'`).
- `/account/sessions` — إدارة الجلسات النشطة (revoke, devices, IPs).

## 4. SSO Flow (موجز)

```
HN-Chat ──(redirect)──▶ db-guard.lovable.app/sso/authorize?app=chat&redirect=...
                          │
                  مسجّل؟  ├── نعم → issueSsoTicket → redirect=...?ticket=XYZ
                          └── لا  → /login?next=/sso/authorize?... ثم يكمل
                          
HN-Chat ──POST /api/public/sso/verify {ticket} ──▶ DB-GUARD
                          ◀── { user, hn_user_code, jwt, expires_at }
```

التذكرة: استخدام مرة واحدة، 60 ثانية، مرتبطة بـ target_app + redirect host في `connected_apps.allowed_redirect_hosts`.

## 5. Forgot Password Flow

1. `/forgot-password` → email/HN code → `requestPasswordReset` يولّد OTP 6 أرقام + token، يرسل بريد عبر Resend (template جديد).
2. `/reset-password?token=...` → إدخال OTP + كلمة سر جديدة → `verifyResetCode` ثم `completeReset` → bcrypt hash + إبطال جميع الجلسات + log.
3. كل خطوة تُسجَّل في `password_reset_logs`.

## 6. Sessions Manager

صفحة `/account/sessions` تعرض:
- device (parsed user-agent)، IP، last_active، current/other.
- زر Revoke لكل جلسة + Revoke All Other Sessions.

## 7. Owner Dashboard

`/owner/registered-users` (محمي بـ role=owner):
- جدول: hn_user_code, email, full_name, source_app, plan, status, last_login, created_at.
- فلاتر: source_app, status, plan + بحث.
- تصدير CSV.

## 8. i18n

كل النصوص الجديدة (en/ar/fr/es) تحت keys: `identity.*`, `sso.*`, `passwordReset.*`, `sessions.*`, `owner.users.*`.

## 9. ما يبقى خارج هذا الـ scope

- **التطبيقات الخارجية نفسها** (Chat/Groupe/Driver/Souk) — هذا المشروع هو IdP فقط؛ سأوفّر **SDK snippet** بسيط (`docs/HN_SSO_INTEGRATION.md`) يبيّن كيف يستدعي أي موقع `/sso/authorize` و `/api/public/sso/verify`.
- ربط Google/Apple SSO خارجي — السؤال أدناه.

## أسئلة قبل البدء

1. **Owner Role**: هل أنشئ جدول `user_roles` + `app_role enum('owner','admin','user')` وأمنحك دور owner يدويًا (أعطني email/HN code)، أم تستخدم email محدد (مثلاً `indo@hnchat.net`) كـ hardcoded owner للمرحلة الأولى؟
2. **JWT للتطبيقات**: مدة JWT الذي يُسلَّم للمواقع بعد SSO verify — افتراضيًا **24 ساعة** access + refresh 30 يوم. موافق؟
3. **OTP أم Reset Link**: للـ forgot password — **OTP 6 أرقام** (أبسط ولا يحتاج صفحة عامة في كل موقع) أم **reset link** قابل للنقر؟
4. **Connected apps seed**: هل أضيف الأربعة (chat, groupe, driver, souk) كـ records أولية مع `allowed_redirect_hosts=['*.hnchat.net']` كـ placeholder، أم تعطيني الـ domains الفعلية الآن؟

بعد إجاباتك أنفّذ كل شيء في خطوة واحدة (migration + server fns + routes + i18n + SDK doc).