# نسخة مستقلة من الموقع — تشغيل ذاتي

اقرأ الدليل الكامل بالعربية في: [`docs/SELF-HOSTING-AR.md`](./docs/SELF-HOSTING-AR.md)

## تشغيل سريع (Quick Start)

```bash
# 1. انسخ ملف البيئة وعدّله
cp .env.docker.example .env
nano .env

# 2. شغّل كل شيء بأمر واحد
docker compose up -d --build

# 3. شغّل migrations
docker compose exec app node scripts/migrate.ts

# 4. افتح المتصفح
# http://localhost:3000
```

## ما الذي يعمل في الخلفية

- **app** — الموقع (Node.js على المنفذ 3000)
- **postgres** — قاعدة البيانات (Postgres 16)
- **neon-proxy** — وسيط يجعل الكود يعمل مع Postgres محلي بدون تعديل

## بدون اعتماد على

- ❌ Lovable
- ❌ Neon (السحابي)
- ❌ Supabase
- ❌ Cloudflare

كل شيء يعمل على سيرفرك أنت.
