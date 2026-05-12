# Tests

## Run

```bash
bun run test          # unit only (no DB needed)
bun run test:int      # integration (requires HN_DB_TEST_URL)
bun run test:cov      # unit + coverage report
```

## Layers

- **`tests/unit/`** — pure functions. No network, no DB.
  - `password.test.ts` — PBKDF2 hash/verify, salt randomness, malformed-hash rejection.
  - `jwt.test.ts` — JWT round-trip, tamper rejection, expiry rejection.
  - `cookies.test.ts` — Set-Cookie hardening flags + parsing.
  - `url.test.ts` — URL normalization + SSRF blocklist (private IPs, metadata, localhost).
  - `env.test.ts` — required-env validation.

- **`tests/integration/`** — live database required. Skipped automatically when
  `HN_DB_TEST_URL` is unset.
  - `tenant-isolation.test.ts` — proves tenant B cannot read tenant A's records
    when DAL queries use `WHERE tenant_id = $self`.

## Setting up an integration DB

1. Create a disposable Neon branch (or any Postgres ≥ 14).
2. Apply the migrations against it:
   ```bash
   HN_DB_DIRECT_URL="postgresql://..." bun run scripts/migrate.ts
   ```
3. Export the same URL as `HN_DB_TEST_URL` and run `bun run test:int`.

## CI hint

Run `bun run test` on every PR. Run `bun run test:int` in a separate job
that provisions an ephemeral Neon branch.
