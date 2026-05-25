import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { consumeSsoTicket } from "@/lib/identity/sso.functions";

export const Route = createFileRoute("/sso/callback")({
  head: () => ({ meta: [{ title: "SSO Callback — DB-GUARD" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    hn_ticket: typeof s.hn_ticket === "string" ? s.hn_ticket : "",
    hn_app: typeof s.hn_app === "string" ? s.hn_app : "",
    next: typeof s.next === "string" ? s.next : "/dashboard",
  }),
  component: SsoCallbackPage,
});

function SsoCallbackPage() {
  const { hn_ticket, hn_app, next } = Route.useSearch();
  const consumeFn = useServerFn(consumeSsoTicket);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hn_ticket || !hn_app) { setError("Missing ticket"); return; }
    (async () => {
      try {
        const r = await consumeFn({ data: { ticket: hn_ticket, app_key: hn_app } });
        if (!r.ok) { setError("Invalid or expired ticket"); return; }
        // Session is established via HttpOnly cookie set server-side.
        // Do NOT persist JWT/user in localStorage (XSS exfiltration risk).
        navigate({ to: next as never, replace: true });
      } catch { setError("Network error"); }
    })();
  }, [hn_ticket, hn_app, next, consumeFn, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md text-center space-y-3">
        {error ? <p className="text-destructive">{error}</p> : <p className="text-muted-foreground">Completing sign-in…</p>}
      </div>
    </div>
  );
}
