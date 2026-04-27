/**
 * Storage abstraction. Today: store object bytes in Postgres (bytea).
 * Tomorrow: swap to Cloudflare R2 by adding a binding and replacing the
 * driver — the interface stays identical.
 *
 * Tenant isolation: every key MUST start with `t/<tenantId>/p/<projectId>/`.
 * The driver enforces this prefix, and the API layer also enforces it.
 */
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "../env.server";

export type StoredObject = {
  key: string;
  size: number;
  contentType: string | null;
  bytes: Uint8Array;
  createdAt: string;
};

export interface StorageDriver {
  put(key: string, bytes: Uint8Array, contentType?: string | null): Promise<{ size: number }>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  list(prefix: string, limit?: number): Promise<Array<Pick<StoredObject, "key" | "size" | "contentType" | "createdAt">>>;
}

const KEY_RE = /^t\/[0-9a-f-]{36}\/p\/[0-9a-f-]{36}\/[A-Za-z0-9._\/-]{1,500}$/;

export function buildKey(tenantId: string, projectId: string, name: string): string {
  const clean = name.replace(/^\/+/, "").replace(/\.\.+/g, ".").slice(0, 500);
  if (!/^[A-Za-z0-9._\/-]+$/.test(clean)) {
    throw new Error("invalid_key_chars");
  }
  const key = `t/${tenantId}/p/${projectId}/${clean}`;
  if (!KEY_RE.test(key)) throw new Error("invalid_key");
  return key;
}

export function assertKey(key: string) {
  if (!KEY_RE.test(key)) throw new Error("invalid_key");
}

export function assertKeyForTenant(key: string, tenantId: string) {
  assertKey(key);
  if (!key.startsWith(`t/${tenantId}/`)) throw new Error("key_not_owned");
}

// ─────────────────────────────────────────────────────────────────
// Postgres-backed driver (bootstrap; swap to R2 binding later)
// ─────────────────────────────────────────────────────────────────

let _sql: ReturnType<typeof neon> | null = null;
function pool() {
  if (_sql) return _sql;
  _sql = neon(requireEnv().HN_DB_URL);
  return _sql;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "\\x";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    hex += (b < 16 ? "0" : "") + b.toString(16);
  }
  return hex;
}

function hexToBytes(s: string): Uint8Array {
  const clean = s.startsWith("\\x") ? s.slice(2) : s;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

class PgStorage implements StorageDriver {
  async ensureTable() {
    const sql = pool();
    await sql`
      CREATE TABLE IF NOT EXISTS storage_objects (
        key          TEXT PRIMARY KEY,
        content_type TEXT,
        size_bytes   BIGINT NOT NULL,
        bytes        BYTEA NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  }

  async put(key: string, bytes: Uint8Array, contentType: string | null = null) {
    assertKey(key);
    await this.ensureTable();
    const sql = pool();
    if (bytes.byteLength > 25 * 1024 * 1024) {
      throw new Error("object_too_large");
    }
    const hex = bytesToHex(bytes);
    await sql`
      INSERT INTO storage_objects (key, content_type, size_bytes, bytes)
      VALUES (${key}, ${contentType}, ${bytes.byteLength}, ${hex}::bytea)
      ON CONFLICT (key) DO UPDATE SET
        content_type = EXCLUDED.content_type,
        size_bytes   = EXCLUDED.size_bytes,
        bytes        = EXCLUDED.bytes
    `;
    return { size: bytes.byteLength };
  }

  async get(key: string) {
    assertKey(key);
    await this.ensureTable();
    const sql = pool();
    const rows = (await sql`
      SELECT key, content_type, size_bytes,
             encode(bytes, 'hex') AS bytes_hex,
             created_at
        FROM storage_objects
       WHERE key = ${key}
       LIMIT 1
    `) as Array<{
      key: string;
      content_type: string | null;
      size_bytes: number;
      bytes_hex: string;
      created_at: string;
    }>;
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      key: r.key,
      size: Number(r.size_bytes),
      contentType: r.content_type,
      bytes: hexToBytes(r.bytes_hex),
      createdAt: r.created_at,
    };
  }

  async delete(key: string) {
    assertKey(key);
    const sql = pool();
    await sql`DELETE FROM storage_objects WHERE key = ${key}`;
  }

  async list(prefix: string, limit = 100) {
    if (!prefix.startsWith("t/")) throw new Error("invalid_prefix");
    const sql = pool();
    const like = `${prefix}%`;
    const lim = Math.max(1, Math.min(500, limit));
    const rows = (await sql`
      SELECT key, content_type, size_bytes, created_at
        FROM storage_objects
       WHERE key LIKE ${like}
       ORDER BY created_at DESC
       LIMIT ${lim}
    `) as Array<{
      key: string;
      content_type: string | null;
      size_bytes: number;
      created_at: string;
    }>;
    return rows.map((r) => ({
      key: r.key,
      size: Number(r.size_bytes),
      contentType: r.content_type,
      createdAt: r.created_at,
    }));
  }
}

let _driver: StorageDriver | null = null;
export function getStorage(): StorageDriver {
  if (_driver) return _driver;
  _driver = new PgStorage();
  return _driver;
}
