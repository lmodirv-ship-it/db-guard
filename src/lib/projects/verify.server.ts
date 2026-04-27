/**
 * Site ownership verification.
 * Methods (in order, first to succeed wins):
 *   1. well_known: GET https://<host>/.well-known/hn-verify-<token>.txt
 *      — body must contain the token.
 *   2. dns_txt:    DNS TXT record on _hn-verify.<host> containing the token.
 *      Uses Cloudflare DNS-over-HTTPS (no native dns module on Workers).
 *   3. meta_tag:   <meta name="hn-verify" content="<token>"> in homepage HTML.
 */
import { safeFetch, type NormalizedUrl } from "./url.server";

export type VerifyMethod = "well_known" | "dns_txt" | "meta_tag";

export type VerifyResult =
  | { ok: true; method: VerifyMethod; detail: string }
  | { ok: false; attempts: Array<{ method: VerifyMethod; ok: false; reason: string }> };

const TOKEN_RE = /^[a-f0-9]{16,128}$/i;

function assertToken(token: string) {
  if (!TOKEN_RE.test(token)) throw new Error("invalid_verification_token");
}

export async function verifyOwnership(
  site: NormalizedUrl,
  token: string,
): Promise<VerifyResult> {
  assertToken(token);
  const attempts: Array<{ method: VerifyMethod; ok: false; reason: string }> = [];

  // 1. well-known
  try {
    const url = `${site.origin}/.well-known/hn-verify-${token}.txt`;
    const res = await safeFetch(url, { timeoutMs: 8_000, maxBytes: 64 * 1024 });
    if (res.status === 200 && res.body.includes(token)) {
      return { ok: true, method: "well_known", detail: url };
    }
    attempts.push({
      method: "well_known",
      ok: false,
      reason: `status=${res.status}`,
    });
  } catch (err) {
    attempts.push({
      method: "well_known",
      ok: false,
      reason: err instanceof Error ? err.message : "fetch_failed",
    });
  }

  // 2. DNS TXT via DoH
  try {
    const txt = await dohTxtLookup(`_hn-verify.${site.hostname}`);
    if (txt.some((r) => r.includes(token))) {
      return { ok: true, method: "dns_txt", detail: `_hn-verify.${site.hostname}` };
    }
    attempts.push({
      method: "dns_txt",
      ok: false,
      reason: txt.length === 0 ? "no_records" : "token_not_found",
    });
  } catch (err) {
    attempts.push({
      method: "dns_txt",
      ok: false,
      reason: err instanceof Error ? err.message : "dns_failed",
    });
  }

  // 3. meta tag
  try {
    const res = await safeFetch(site.normalized, {
      timeoutMs: 10_000,
      maxBytes: 1_500_000,
    });
    if (res.status >= 200 && res.status < 400) {
      const re = new RegExp(
        `<meta[^>]+name=["']hn-verify["'][^>]+content=["']${token}["']`,
        "i",
      );
      if (re.test(res.body)) {
        return { ok: true, method: "meta_tag", detail: site.normalized };
      }
    }
    attempts.push({ method: "meta_tag", ok: false, reason: `status=${res.status}` });
  } catch (err) {
    attempts.push({
      method: "meta_tag",
      ok: false,
      reason: err instanceof Error ? err.message : "fetch_failed",
    });
  }

  return { ok: false, attempts };
}

async function dohTxtLookup(name: string): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
    name,
  )}&type=TXT`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`doh_status_${res.status}`);
    const json = (await res.json()) as { Answer?: Array<{ data: string; type: number }> };
    if (!json.Answer) return [];
    return json.Answer.filter((a) => a.type === 16).map((a) =>
      a.data.replace(/^"|"$/g, "").replace(/"\s+"/g, ""),
    );
  } finally {
    clearTimeout(t);
  }
}
