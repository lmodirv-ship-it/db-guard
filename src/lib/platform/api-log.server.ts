/**
 * Centralized API request logger.
 * Records every incoming public-API call into hn_api_logs (fire-and-forget).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ApiLogEntry = {
  endpoint: string;
  method: string;
  status: number;
  workspace_id?: string | null;
  api_key_id?: string | null;
  hn_user_id?: string | null;
  origin?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  duration_ms?: number | null;
  request_bytes?: number | null;
  response_bytes?: number | null;
  error?: string | null;
};

export function logApiRequest(entry: ApiLogEntry): void {
  // fire-and-forget; never block the response
  void supabaseAdmin
    .from("hn_api_logs")
    .insert({
      endpoint: entry.endpoint.slice(0, 500),
      method: entry.method,
      status: entry.status,
      workspace_id: entry.workspace_id ?? null,
      api_key_id: entry.api_key_id ?? null,
      hn_user_id: entry.hn_user_id ?? null,
      origin: entry.origin?.slice(0, 255) ?? null,
      ip: entry.ip?.slice(0, 64) ?? null,
      user_agent: entry.user_agent?.slice(0, 500) ?? null,
      duration_ms: entry.duration_ms ?? null,
      request_bytes: entry.request_bytes ?? null,
      response_bytes: entry.response_bytes ?? null,
      error: entry.error?.slice(0, 1000) ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("[api-log] insert_failed:", error.message);
    });
}

/**
 * Wrap a public-API handler so every request is automatically logged.
 * Usage:
 *   GET: withApiLog(async ({ request, params }) => { ... })
 */
export function withApiLog<P = unknown>(
  handler: (ctx: { request: Request; params: P }) => Promise<Response> | Response,
) {
  return async (ctx: { request: Request; params: P }): Promise<Response> => {
    const started = Date.now();
    const req = ctx.request;
    const url = new URL(req.url);
    let res: Response;
    let errMsg: string | null = null;
    try {
      res = await handler(ctx);
    } catch (e) {
      errMsg = e instanceof Error ? e.message : "unknown_error";
      res = new Response(JSON.stringify({ ok: false, error: "server_error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // best-effort metadata extraction
    const apiKeyId = (res.headers.get("x-hn-key-id") || null) as string | null;
    const workspaceId = (res.headers.get("x-hn-workspace") || null) as string | null;
    if (apiKeyId) res.headers.delete("x-hn-key-id");
    if (workspaceId) res.headers.delete("x-hn-workspace");

    logApiRequest({
      endpoint: url.pathname,
      method: req.method,
      status: res.status,
      api_key_id: apiKeyId,
      workspace_id: workspaceId,
      origin: req.headers.get("origin"),
      ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      duration_ms: Date.now() - started,
      error: errMsg,
    });

    return res;
  };
}
