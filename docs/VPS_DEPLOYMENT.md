# DB-GUARD on a self-hosted VPS

DB-GUARD is built with TanStack Start (Node SSR + Vite) and PostgreSQL. It
is designed to run unchanged on Lovable Cloud or on your own VPS. This
document describes the VPS path.

---

## 1. Required services

| Service     | Notes                                                |
| ----------- | ---------------------------------------------------- |
| Node.js 20+ | runtime                                              |
| PostgreSQL  | apply every file in `supabase/migrations/` in order  |
| Nginx       | TLS termination + reverse proxy                      |
| SMTP        | password-reset / verification emails (or Resend API) |
| PM2         | process supervisor                                   |

---

## 2. Environment variables (`.env`)

```env
# Database (direct Postgres URL — full read/write)
HN_DB_URL=postgres://hn:password@127.0.0.1:5432/hn_identity
HN_DB_DIRECT_URL=postgres://hn:password@127.0.0.1:5432/hn_identity

# JWT signing (HS256, min 32 bytes random)
HN_JWT_SECRET=replace-with-openssl-rand-hex-32

# Mail
HN_MAIL_FROM="HN Identity <noreply@hnchat.net>"
RESEND_API_KEY=re_xxx       # OR configure your own SMTP

# Public URLs
PUBLIC_SITE_URL=https://id.hnchat.net

# (Optional) Supabase compatibility — only if you keep using Supabase auth
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Generate a JWT secret:

```bash
openssl rand -hex 32
```

---

## 3. PostgreSQL bootstrap

```bash
sudo -u postgres psql <<SQL
CREATE USER hn WITH PASSWORD 'password';
CREATE DATABASE hn_identity OWNER hn;
SQL

# apply migrations in order
for f in supabase/migrations/*.sql; do
  psql "$HN_DB_URL" -f "$f"
done
```

---

## 4. Build & run

```bash
git clone <repo> /opt/db-guard && cd /opt/db-guard
npm ci
npm run build      # produces .output/ (Nitro server)
node .output/server/index.mjs
```

PM2 (recommended for production):

```bash
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 5. Nginx reverse proxy

```nginx
server {
  listen 443 ssl http2;
  server_name id.hnchat.net;

  ssl_certificate     /etc/letsencrypt/live/id.hnchat.net/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/id.hnchat.net/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }
}

server {
  listen 80;
  server_name id.hnchat.net;
  return 301 https://$host$request_uri;
}
```

---

## 6. Docker (alternative)

```bash
docker compose up -d --build
```

This launches PostgreSQL + the app on `:3000`. See `docker-compose.yml` and
`Dockerfile` at the repository root.

---

## 7. Health check

```bash
curl https://id.hnchat.net/api/public/sso/verify -X OPTIONS -i
# expect HTTP/1.1 204
```

---

## 8. Migrating off Lovable Cloud

DB-GUARD does not depend on Supabase Edge Functions, Storage, or Realtime —
only Postgres + Auth. To migrate:

1. `pg_dump` the Supabase database, restore into your Postgres.
2. Set `HN_DB_URL` to the new Postgres.
3. Replace any `auth.users` references with the existing `hn_users` table
   (DB-GUARD already authenticates against `hn_users.password_hash`).
4. Deploy with PM2 + Nginx as above.

No code changes are required.
