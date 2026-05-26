/**
 * URL normalization & validation for the Smart Project Generator.
 * Blocks SSRF targets (private IPs, localhost, link-local, metadata).
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254", // cloud metadata
]);

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal"];

export type NormalizedUrl = {
  raw: string;
  normalized: string; // https://host[:port]/
  origin: string;
  host: string; // lowercased
  hostname: string; // without port
};

export class UrlValidationError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export function normalizeProjectUrl(input: string): NormalizedUrl {
  if (typeof input !== "string") throw new UrlValidationError("url_invalid");
  let raw = input.trim();
  if (!raw) throw new UrlValidationError("url_empty");
  if (raw.length > 2048) throw new UrlValidationError("url_too_long");
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new UrlValidationError("url_invalid");
  }

  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new UrlValidationError("url_protocol");
  }

  const hostname = u.hostname.toLowerCase();
  if (!hostname || hostname.length > 253) {
    throw new UrlValidationError("url_host_invalid");
  }

  if (BLOCKED_HOSTS.has(hostname)) throw new UrlValidationError("url_blocked");
  for (const suf of BLOCKED_HOST_SUFFIXES) {
    if (hostname.endsWith(suf)) throw new UrlValidationError("url_blocked");
  }
  if (isPrivateIp(hostname)) throw new UrlValidationError("url_blocked");

  // Force https for canonical comparison.
  u.protocol = "https:";
  u.hash = "";
  u.search = "";
  if (!u.pathname || u.pathname === "") u.pathname = "/";

  return {
    raw: input,
    normalized: u.toString(),
    origin: u.origin,
    host: u.host.toLowerCase(),
    hostname,
  };
}

function isPrivateIp(host: string): boolean {
  // IPv4
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    return false;
  }
  // IPv6 obvious cases
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("fe80:")) return true;
  return false;
}

/** Safe fetch with timeout + size cap. Used by verification & analyzer. */
export async function safeFetch(
  url: string,
  opts: { timeoutMs?: number; maxBytes?: number; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: string; contentType: string | null }> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const maxBytes = opts.maxBytes ?? 2_000_000; // 2 MB
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "SmartGeneratorBot/1.0 (+verification)",
        Accept: "text/html,application/xhtml+xml,text/plain,*/*;q=0.5",
        ...(opts.headers ?? {}),
      },
    });
    const contentType = res.headers.get("content-type");
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { status: res.status, body: text.slice(0, maxBytes), contentType };
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        break;
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    const body = new TextDecoder("utf-8", { fatal: false }).decode(merged);
    return { status: res.status, body, contentType };
  } finally {
    clearTimeout(t);
  }
}
