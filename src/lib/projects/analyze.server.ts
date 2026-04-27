/**
 * Site analyzer + schema extractor.
 * Strategy:
 *   1. Fetch homepage HTML.
 *   2. Extract title, description, canonical, language, OpenGraph.
 *   3. Find JSON-LD <script type="application/ld+json"> blocks → derive schema.
 *   4. Detect common entity hints (Product, Article, Organization, Person, Event).
 *   5. Sample internal links for a quick crawl preview (capped).
 */
import { safeFetch, type NormalizedUrl } from "./url.server";

export type SiteAnalysis = {
  fetchedAt: string;
  status: number;
  title: string | null;
  description: string | null;
  language: string | null;
  canonical: string | null;
  og: Record<string, string>;
  jsonLdCount: number;
  detectedEntities: string[]; // e.g. ['Product','Article']
  internalLinks: string[]; // absolute URLs, capped 50
  externalLinks: number;
  htmlBytes: number;
};

export type SchemaField = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "url" | "datetime";
  nullable: boolean;
  sample?: unknown;
};

export type SchemaEntity = {
  name: string;
  source: "json_ld" | "heuristic";
  fields: SchemaField[];
  sampleCount: number;
};

export type GeneratedSchema = {
  generatedAt: string;
  entities: SchemaEntity[];
};

export async function analyzeSite(site: NormalizedUrl): Promise<SiteAnalysis> {
  const res = await safeFetch(site.normalized, {
    timeoutMs: 12_000,
    maxBytes: 2_000_000,
  });
  const html = res.body;
  const title = pickTag(html, "title");
  const description = pickMeta(html, "description");
  const language = pickAttr(html, /<html[^>]+lang=["']([^"']+)["']/i);
  const canonical = pickAttr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const og = pickAllMetaPrefix(html, "og:");

  const ldBlocks = extractJsonLd(html);
  const detectedEntities = new Set<string>();
  for (const block of ldBlocks) {
    collectTypes(block, detectedEntities);
  }
  // heuristic supplements
  if (/<article[\s>]/i.test(html)) detectedEntities.add("Article");
  if (/itemtype=["'][^"']*schema\.org\/Product/i.test(html)) detectedEntities.add("Product");

  const links = extractLinks(html, site);
  return {
    fetchedAt: new Date().toISOString(),
    status: res.status,
    title,
    description,
    language,
    canonical,
    og,
    jsonLdCount: ldBlocks.length,
    detectedEntities: [...detectedEntities].sort(),
    internalLinks: links.internal.slice(0, 50),
    externalLinks: links.externalCount,
    htmlBytes: html.length,
  };
}

export function generateSchema(analysis: SiteAnalysis, ldBlocks: unknown[]): GeneratedSchema {
  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const block of ldBlocks) {
    walkLd(block, (obj) => {
      const t = obj["@type"];
      const typeName =
        typeof t === "string" ? t : Array.isArray(t) && typeof t[0] === "string" ? t[0] : null;
      if (!typeName) return;
      const arr = buckets.get(typeName) ?? [];
      arr.push(obj);
      buckets.set(typeName, arr);
    });
  }

  const entities: SchemaEntity[] = [];
  for (const [name, samples] of buckets) {
    entities.push({
      name,
      source: "json_ld",
      sampleCount: samples.length,
      fields: inferFields(samples),
    });
  }

  // Heuristic page-level entity if nothing found.
  if (entities.length === 0) {
    entities.push({
      name: "Page",
      source: "heuristic",
      sampleCount: 1,
      fields: [
        { name: "url", type: "url", nullable: false },
        { name: "title", type: "string", nullable: !analysis.title },
        { name: "description", type: "string", nullable: !analysis.description },
        { name: "language", type: "string", nullable: !analysis.language },
      ],
    });
  }

  return { generatedAt: new Date().toISOString(), entities };
}

/** Combined helper used by /api/projects/:id/analyze */
export async function analyzeAndExtract(
  site: NormalizedUrl,
): Promise<{ analysis: SiteAnalysis; schema: GeneratedSchema }> {
  const res = await safeFetch(site.normalized, {
    timeoutMs: 12_000,
    maxBytes: 2_000_000,
  });
  const html = res.body;
  const analysis = await analyzeSite(site); // re-uses fetch via cache? simple: refetch (cheap)
  const ldBlocks = extractJsonLd(html);
  const schema = generateSchema(analysis, ldBlocks);
  return { analysis, schema };
}

// ────────────────────────────────────────────────────────────────
// HTML helpers (no DOM in Workers; light regex parsing is fine
// because output is consumed by us, not rendered).
// ────────────────────────────────────────────────────────────────

function pickTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = html.match(re);
  return m ? decodeHtml(m[1].trim()).slice(0, 500) : null;
}

function pickMeta(html: string, name: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return decodeHtml(m[1]).slice(0, 500);
  // reverse attribute order
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2 ? decodeHtml(m2[1]).slice(0, 500) : null;
}

function pickAttr(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? decodeHtml(m[1]) : null;
}

function pickAllMetaPrefix(html: string, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1].startsWith(prefix)) out[m[1]] = decodeHtml(m[2]).slice(0, 500);
    if (Object.keys(out).length > 50) break;
  }
  return out;
}

function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      out.push(parsed);
    } catch {
      // ignore malformed JSON-LD
    }
    if (out.length > 20) break;
  }
  return out;
}

function collectTypes(node: unknown, into: Set<string>): void {
  walkLd(node, (obj) => {
    const t = obj["@type"];
    if (typeof t === "string") into.add(t);
    else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") into.add(x);
  });
}

function walkLd(node: unknown, fn: (obj: Record<string, unknown>) => void): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const x of node) walkLd(x, fn);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if ("@graph" in obj && Array.isArray(obj["@graph"])) {
    for (const x of obj["@graph"] as unknown[]) walkLd(x, fn);
  }
  if ("@type" in obj) fn(obj);
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") walkLd(v, fn);
  }
}

function inferFields(samples: Record<string, unknown>[]): SchemaField[] {
  const fieldMap = new Map<string, { types: Set<string>; nullCount: number; sample?: unknown }>();
  for (const s of samples) {
    for (const [k, v] of Object.entries(s)) {
      if (k.startsWith("@")) continue;
      const entry = fieldMap.get(k) ?? { types: new Set<string>(), nullCount: 0 };
      if (v === null || v === undefined) entry.nullCount++;
      else {
        entry.types.add(detectType(k, v));
        if (entry.sample === undefined) entry.sample = v;
      }
      fieldMap.set(k, entry);
    }
  }
  const out: SchemaField[] = [];
  for (const [name, info] of fieldMap) {
    const types = [...info.types];
    const type = (types[0] ?? "string") as SchemaField["type"];
    out.push({
      name,
      type,
      nullable: info.nullCount > 0 || info.types.size === 0,
      sample: truncateSample(info.sample),
    });
  }
  return out.slice(0, 100);
}

function detectType(name: string, v: unknown): SchemaField["type"] {
  if (Array.isArray(v)) return "array";
  if (v === null) return "string";
  switch (typeof v) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    case "string": {
      if (/^https?:\/\//i.test(v)) return "url";
      if (/^\d{4}-\d{2}-\d{2}(T|\s)/.test(v)) return "datetime";
      const lower = name.toLowerCase();
      if (lower.endsWith("url") || lower === "image") return "url";
      if (lower.includes("date") || lower.includes("time")) return "datetime";
      return "string";
    }
    default:
      return "string";
  }
}

function truncateSample(v: unknown): unknown {
  if (typeof v === "string") return v.slice(0, 200);
  if (Array.isArray(v)) return v.slice(0, 3);
  return v;
}

function extractLinks(
  html: string,
  site: NormalizedUrl,
): { internal: string[]; externalCount: number } {
  const internal = new Set<string>();
  let externalCount = 0;
  const re = /<a[^>]+href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(html))) {
    count++;
    if (count > 500) break;
    const href = m[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    let abs: URL;
    try {
      abs = new URL(href, site.normalized);
    } catch {
      continue;
    }
    if (abs.hostname.toLowerCase() === site.hostname) {
      internal.add(abs.toString());
    } else {
      externalCount++;
    }
    if (internal.size > 200) break;
  }
  return { internal: [...internal], externalCount };
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
