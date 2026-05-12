/**
 * Access Cloudflare Worker bindings (R2, Queues) from inside server code.
 *
 * TanStack Start exposes the Worker `env` via `cloudflare:workers`.
 * In local `vite dev` the bindings may be undefined — callers MUST handle
 * that with a clear error so we never silently no-op a write.
 */

// We import lazily so Node-only contexts (scripts) don't crash on the
// `cloudflare:workers` virtual module.
type R2Bucket = {
  put: (
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    opts?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
  get: (key: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; size: number } | null>;
  delete: (key: string) => Promise<void>;
  list: (opts?: { prefix?: string; limit?: number }) => Promise<{ objects: Array<{ key: string; size: number; uploaded: Date }> }>;
};

type Queue<T = unknown> = {
  send: (body: T, opts?: { contentType?: "json" | "text" | "bytes" | "v8" }) => Promise<void>;
  sendBatch: (messages: Array<{ body: T }>) => Promise<void>;
};

export type WorkerEnv = {
  HN_R2?: R2Bucket;
  HN_JOBS?: Queue;
};

let _envPromise: Promise<WorkerEnv | null> | null = null;

async function loadEnv(): Promise<WorkerEnv | null> {
  if (_envPromise) return _envPromise;
  _envPromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — virtual module provided by Cloudflare runtime
      const mod = await import("cloudflare:workers");
      return (mod.env ?? null) as WorkerEnv | null;
    } catch {
      return null;
    }
  })();
  return _envPromise;
}

export async function getR2(): Promise<R2Bucket> {
  const env = await loadEnv();
  if (!env?.HN_R2) {
    throw new Error("r2_binding_missing — HN_R2 not bound (check wrangler.jsonc)");
  }
  return env.HN_R2;
}

export async function getJobsQueue(): Promise<Queue | null> {
  const env = await loadEnv();
  return env?.HN_JOBS ?? null;
}
