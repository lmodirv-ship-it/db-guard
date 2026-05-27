# دليل تشغيل الموقع على سيرفر مستقل (عربي)

هذا الدليل يشرح خطوة بخطوة كيف تشغّل الموقع كاملاً على سيرفر تملكه أنت، بدون الاعتماد على Lovable أو Neon أو Supabase أو Cloudflare.

---

## ما ستحتاجه

1. **سيرفر VPS** — موصى به: Hetzner CX22 (5€/شهر، ألمانيا) أو DigitalOcean (6$/شهر)
2. **نطاق (اختياري)** — لربطه بالموقع
3. **حاسوب** فيه SSH للاتصال بالسيرفر

---

## الخطوة 1: شراء سيرفر Hetzner

1. ادخل إلى https://www.hetzner.com/cloud
2. أنشئ حساباً جديداً
3. اضغط **+ Add Server**
4. اختر:
   - **Location:** Nuremberg أو Helsinki
   - **Image:** Ubuntu 24.04
   - **Type:** CX22 (الأرخص، كافي تماماً)
   - **SSH Key:** أضف مفتاحك (أو اختر كلمة سر)
5. اضغط **Create & Buy now**
6. انسخ عنوان IP الذي ستحصل عليه

---

## الخطوة 2: الاتصال بالسيرفر

من حاسوبك، افتح Terminal واكتب:

```bash
ssh root@YOUR_SERVER_IP
```

استبدل `YOUR_SERVER_IP` بعنوان IP الذي حصلت عليه.

---

## الخطوة 3: تثبيت Docker

انسخ والصق هذه الأوامر سطراً سطراً:

```bash
# تحديث النظام
apt update && apt upgrade -y

# تثبيت Docker
curl -fsSL https://get.docker.com | sh

# التأكد من التثبيت
docker --version
docker compose version
```

---

## الخطوة 4: رفع الموقع للسيرفر

من حاسوبك (وليس السيرفر)، ارفع ملف ZIP:

```bash
scp hn-bd-selfhosted.zip root@YOUR_SERVER_IP:/root/
```

ثم عُد إلى السيرفر وفك الضغط:

```bash
cd /root
apt install -y unzip
unzip hn-bd-selfhosted.zip
cd hn-bd-selfhosted
```

---

## الخطوة 5: ضبط متغيرات البيئة

```bash
cp .env.docker.example .env
nano .env
```

عدّل القيم:
- `POSTGRES_PASSWORD` — أي كلمة سر قوية
- `HN_JWT_SECRET` — ولّد قيمة عشوائية:
  ```bash
  openssl rand -base64 48
  ```
- `RESEND_API_KEY` — (اختياري) من https://resend.com للإيميل
- `HN_MAIL_FROM` — إيميل المرسل

احفظ بـ `Ctrl+O` ثم `Enter` ثم `Ctrl+X`.

---

## الخطوة 6: تشغيل الموقع

```bash
docker compose up -d --build
```

انتظر 2-3 دقائق حتى يبني الصورة ويشغّل كل شيء.

تحقق أن كل شيء يعمل:

```bash
docker compose ps
docker compose logs app
```

---

## الخطوة 7: تشغيل migrations قاعدة البيانات

```bash
docker compose exec app node scripts/migrate.ts
```

هذا ينشئ كل الجداول من ملفات `migrations/`.

---

## الخطوة 8: فتح الموقع

من المتصفح ادخل: `http://YOUR_SERVER_IP:3000`

يجب أن يعمل الموقع! ✅

---

## الخطوة 9 (اختياري): ربط النطاق + SSL مجاني

### أ) ربط النطاق
1. من لوحة تحكم النطاق (مثلاً Cloudflare أو LWS)، أضف سجل A:
   - **Name:** `@` أو `www`
   - **Value:** عنوان IP السيرفر

### ب) تثبيت Caddy (يضيف SSL تلقائياً)

```bash
apt install -y caddy
```

أنشئ ملف الإعداد:
```bash
nano /etc/caddy/Caddyfile
```

ضع فيه (استبدل النطاق):
```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

شغّل Caddy:
```bash
systemctl restart caddy
```

بعد دقيقتين، النطاق سيعمل مع SSL مجاني تلقائياً!

---

## النسخ الاحتياطي اليومي

أنشئ سكريبت نسخ احتياطي:

```bash
nano /root/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
docker compose -f /root/hn-bd-selfhosted/docker-compose.yml exec -T postgres \
  pg_dump -U app appdb | gzip > /root/backup-$DATE.sql.gz
# احذف النسخ الأقدم من 30 يوم
find /root -name "backup-*.sql.gz" -mtime +30 -delete
```

```bash
chmod +x /root/backup.sh
crontab -e
```

أضف هذا السطر (نسخة احتياطية يومياً الساعة 3 صباحاً):
```
0 3 * * * /root/backup.sh
```

---

## أوامر مفيدة

| الأمر | الوظيفة |
|------|---------|
| `docker compose ps` | عرض حالة الخدمات |
| `docker compose logs -f app` | عرض سجلات الموقع |
| `docker compose restart app` | إعادة تشغيل الموقع |
| `docker compose down` | إيقاف كل شيء |
| `docker compose up -d` | تشغيل كل شيء |
| `docker compose pull && docker compose up -d --build` | تحديث |

---

## استعادة نسخة احتياطية

```bash
gunzip < backup-20260527.sql.gz | docker compose exec -T postgres psql -U app -d appdb
```

---

## ترحيل بياناتك الحالية من Lovable

إذا أردت نقل بياناتك من Neon الحالي إلى السيرفر الجديد:

1. من حاسوبك، صدّر البيانات:
   ```bash
   pg_dump "YOUR_CURRENT_NEON_URL" > current-data.sql
   ```

2. ارفعها للسيرفر:
   ```bash
   scp current-data.sql root@YOUR_SERVER_IP:/root/
   ```

3. على السيرفر، استورد:
   ```bash
   cd /root/hn-bd-selfhosted
   docker compose exec -T postgres psql -U app -d appdb < /root/current-data.sql
   ```

---

## التكلفة الشهرية المتوقعة

| البند | التكلفة |
|------|---------|
| سيرفر Hetzner CX22 | 5€ |
| النطاق (سنوياً) | ~10€/سنة (≈1€/شهر) |
| **المجموع** | **~6€/شهر** |

كافي تماماً لآلاف المستخدمين النشطين.

---

## دعم

- **Hetzner:** https://docs.hetzner.com/cloud
- **Docker:** https://docs.docker.com
- **Caddy:** https://caddyserver.com/docs

بالتوفيق! 🚀
