// Deterministic mock data for the DB-GUARD control center.
// Used for visual richness when real data is sparse or absent.

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function timeSeries(points = 24, base = 800, variance = 200, seed = 42) {
  const rnd = mulberry32(seed);
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => ({
    t: new Date(now - (points - 1 - i) * 60_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    requests: Math.round(base + (rnd() - 0.3) * variance),
    errors: Math.max(0, Math.round((rnd() - 0.7) * 20)),
    latency: Math.round(40 + rnd() * 60),
  }));
}

export function queryPerf(seed = 7) {
  const rnd = mulberry32(seed);
  const queries = [
    "SELECT * FROM users WHERE active = true",
    "INSERT INTO events (type, payload)",
    "UPDATE sessions SET last_seen = now()",
    "SELECT count(*) FROM orders",
    "SELECT id, name FROM products LIMIT 100",
    "DELETE FROM expired_tokens",
  ];
  return queries.map((q, i) => ({
    q,
    calls: Math.round(120 + rnd() * 800),
    avg: +(2 + rnd() * 18).toFixed(1),
    p95: +(8 + rnd() * 60).toFixed(1),
    rows: Math.round(rnd() * 50_000),
    seed: i,
  }));
}

export function activityFeed(seed = 3) {
  const rnd = mulberry32(seed);
  const ev = [
    { kind: "insert", icon: "↑", label: "Record inserted", target: "users" },
    { kind: "auth", icon: "◆", label: "API key used", target: "key_live_a3f…" },
    { kind: "schema", icon: "⌬", label: "Column added", target: "products.sku" },
    { kind: "backup", icon: "▣", label: "Backup completed", target: "snap_2026_05_25" },
    { kind: "alert", icon: "!", label: "Slow query detected", target: "orders.report" },
    { kind: "delete", icon: "×", label: "Record removed", target: "sessions" },
    { kind: "login", icon: "→", label: "Team member signed in", target: "alex@acme.com" },
  ];
  return Array.from({ length: 14 }, (_, i) => {
    const e = ev[Math.floor(rnd() * ev.length)];
    return {
      id: `evt_${i}`,
      ...e,
      ago: `${Math.round(rnd() * 58 + 1)}m ago`,
    };
  });
}

export function regionalLoad() {
  return [
    { region: "us-east-1", load: 72, status: "healthy" },
    { region: "eu-west-1", load: 41, status: "healthy" },
    { region: "ap-south-1", load: 88, status: "degraded" },
    { region: "sa-east-1", load: 23, status: "healthy" },
  ];
}

export function endpointTraffic(seed = 11) {
  const rnd = mulberry32(seed);
  const endpoints = [
    "GET /v1/tables",
    "POST /v1/records",
    "GET /v1/records/:id",
    "PATCH /v1/records/:id",
    "DELETE /v1/records/:id",
    "GET /v1/auth/me",
    "POST /v1/query",
  ];
  return endpoints.map((e) => ({
    endpoint: e,
    calls: Math.round(200 + rnd() * 4800),
    p95: +(8 + rnd() * 90).toFixed(0),
    err: +((rnd() * 1.4).toFixed(2)),
  }));
}

export function mockTerminalLines() {
  return [
    { ts: "10:24:01", level: "info", msg: "[db] connection pool ready (size=24)" },
    { ts: "10:24:03", level: "info", msg: "[auth] issued bearer for tenant_43c1" },
    { ts: "10:24:07", level: "warn", msg: "[query] slow query 142ms on orders.report" },
    { ts: "10:24:12", level: "info", msg: "[backup] snapshot snap_2026_05_25 archived" },
    { ts: "10:24:17", level: "info", msg: "[realtime] 1284 sockets connected" },
    { ts: "10:24:20", level: "error", msg: "[api] 429 throttled key_live_a3f…" },
    { ts: "10:24:23", level: "info", msg: "[migrate] applied 0027_add_index_users_email" },
  ];
}
