# Phase 6 — Security & Readiness Report

Generated for the Smart Project Generator (Cloudflare Workers + Neon + R2 + Queues).

## 1. Threat-model coverage

| Threat | Mitigation | File |
|---|---|---|
| Cross-tenant data read | Application `WHERE tenant_id = $tid` **AND** Postgres RLS via `SET LOCAL app.tenant_id` | `src/lib/db/tenant.server.ts`, `migrations/0002_rls.sql` |
| Cross-tenant R2 access | All keys forced under `t/<tenant>/p/<project>/`, `assertOwnedKey()` rejects traversal | `src/lib/storage/r2.server.ts` |
| SSRF on user URLs | Block `localhost`, `127/8`, `169.254/16`, RFC1918, IPv6 ULA/link-local + 10s timeout + 2 MB cap | `src/lib/projects/url.server.ts` |
| Spoofed ownership | 3-step proof: `.well-known/<token>` → DNS TXT (`_hn-verify.<host>`) → meta tag | `src/lib/projects/verify.server.ts` |
| Password theft | PBKDF2-SHA256 600k iterations, per-user salt, no plaintext logs | `src/lib/auth/password.server.ts` |
| Session hijack | JWT HS256 (jose) in **HttpOnly + Secure + SameSite=Lax** cookie, 7-day TTL | `src/lib/auth/jwt.server.ts`, `cookies.server.ts` |
| Secret leak to browser | All server-only modules use `.server.ts` suffix; no `VITE_` for any secret; `env.server.ts` validates at boot | `src/lib/env.server.ts` |
| DoS via unbounded input | `safeFetch` size cap, Zod `.max()` on every input, `records` import capped at 1 000 / call | `url.server.ts`, `import.ts` |
| Job poison-pill | DB-backed `attempts/max_attempts`, automatic retry w/ backoff, dead-letter on exhaustion | `queue.server.ts`, `process.server.ts` |

## 2. Isolation tests (manual recipe)

```bash
# 1. create two tenants
curl -X POST $URL/api/auth/signup -H 'content-type: application/json' \
  -d '{"tenantName":"AAA","email":"a@x.com","password":"verylongpw1"}' -c a.cookie
curl -X POST $URL/api/auth/signup -H 'content-type: application/json' \
  -d '{"tenantName":"BBB","email":"b@x.com","password":"verylongpw1"}' -c b.cookie

# 2. tenant A creates a project, copy its id
PID=$(curl -s -X POST $URL/api/projects -H 'content-type: application/json' \
  -b a.cookie -d '{"url":"https://example.com"}' | jq -r .project.id)

# 3. tenant B MUST get 404 on A's project
curl -i $URL/api/projects/$PID -b b.cookie    # → 404 not_found
curl -i -X POST $URL/api/projects/$PID/verify -b b.cookie    # → 404
curl -i -X POST $URL/api/projects/$PID/import -b b.cookie \
  -H 'content-type: application/json' -d '{"entity":"x","records":[{"data":{}}]}'    # → 404
```

If RLS is dropped (e.g. `ALTER TABLE projects DISABLE ROW LEVEL SECURITY;`),
the application `WHERE` still returns 404 — both layers must fail to leak.

## 3. Performance budget (per request)

- DB round-trips: **2** (HTTP transaction = 1 RTT for `set_config` + 1 user query, batched).
- HTML fetch ceiling: **2 MB** in **10 s**.
- Queue burst: **10 messages in flight** (wrangler `max_concurrency`), `max_retries: 3`, DLQ `hn-jobs-dlq`.
- Bundle: server-entry ~ 728 KB (under Cloudflare 1 MB compressed limit).

## 4. Production checklist

- [ ] Run `bun run scripts/migrate.ts` against `HN_DB_DIRECT_URL`.
- [ ] `wrangler r2 bucket create hn-projects` (and `hn-projects-preview`).
- [ ] `wrangler queues create hn-jobs && wrangler queues create hn-jobs-dlq`.
- [ ] All 5 secrets present in Workers env (see `.env.example`).
- [ ] `/api/health` returns `200 ok` (currently `503 env_missing` until secrets verified live).
- [ ] Resend domain verified (`HN_MAIL_FROM`).

## 5. Known limitations

- The Cloudflare Queue consumer logic lives in `src/server/queue-consumer.server.ts`
  but TanStack Start owns the Worker entry. To wire it end-to-end, either
  (a) keep using the portable `/api/jobs/drain` endpoint via cron, or
  (b) add a thin custom `src/worker.ts` that re-exports Start's `fetch` plus
  the `queue(batch, env, ctx) { return handleQueueBatch(batch); }` handler
  and point `wrangler.main` at it.
- No email-verification flow yet (Resend wired, route TBD).
- Rate limiting not enforced — recommend Cloudflare WAF rules on `/api/*`.

## 6. Status: **READY FOR STAGING**

All six phases are implemented. Backend, persistence, isolation, queue
plumbing and a working dashboard are in place. Move to production after
checking the box in §4.
