import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { issueSsoTicket } from "@/lib/identity/sso.functions";

export const Route = createFileRoute("/sso/authorize")({
  head: () => ({ meta: [{ title: "SSO — DB-GUARD" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    app: typeof s.app === "string" ? s.app : "",
    redirect: typeof s.redirect === "string" ? s.redirect : "",
  }),
  component: SsoAuthorizePage,
});

function SsoAuthorizePage() {
  const { app, redirect } = Route.useSearch();
  const issueFn = useServerFn(issueSsoTicket);
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [message, setMessage] = useState("Preparing single sign-on…");

  useEffect(() => {
    if (!app || !redirect) {
      setStatus("error");
      setMessage("Missing app or redirect parameter.");
      return;
    }
    (async () => {
      try {
        const r = await issueFn({ data: { target_app: app, redirect_url: redirect } });
        if (!r.ok) {
          if (r.error === "unauthenticated") {
            const next = `/sso/authorize?app=${encodeURIComponent(app)}&redirect=${encodeURIComponent(redirect)}`;
            navigate({ to: `/login?next=${encodeURIComponent(next)}` as never });
            return;
          }
          setStatus("error");
          setMessage(
            r.error === "unknown_app" ? "Unknown application." :
            r.error === "redirect_not_allowed" ? "This redirect URL is not whitelisted." :
            r.error === "bad_redirect" ? "Invalid redirect URL." :
            "Failed to issue SSO ticket."
          );
          return;
        }
        setStatus("redirecting");
        setMessage(`Signing you into ${app}…`);
        window.location.replace(r.redirect_to);
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    })();
  }, [app, redirect, issueFn, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4 rounded-2xl border border-border/40 bg-card/80 p-8">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">HN Unified Identity</div>
        <h1 className="text-xl font-bold">{status === "error" ? "SSO error" : "Authorizing"}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {status === "loading" && <div className="mx-auto h-1 w-32 overflow-hidden rounded bg-muted"><div className="h-full w-1/2 animate-pulse bg-primary" /></div>}
        {status === "error" && (
          <button onClick={() => history.back()} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm">Go back</button>
        )}
      </div>
    </div>
  );
}
