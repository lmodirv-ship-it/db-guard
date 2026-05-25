import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/account-recovery")({
  head: () => ({ meta: [{ title: "Account recovery — DB-GUARD" }] }),
  component: AccountRecovery,
});

function AccountRecovery() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-[11px] tracking-[4px] text-primary">DB-GUARD · IDENTITY</div>
          <h1 className="mt-2 text-2xl font-semibold">Account recovery</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lost access to your account? Choose an option below.
          </p>
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <Link
            to="/forgot-password"
            className="block rounded-lg border border-border px-4 py-3 hover:border-primary/50 hover:bg-primary/5 transition"
          >
            <div className="font-medium">Reset my password</div>
            <div className="text-xs text-muted-foreground">Receive a 6-digit code by email.</div>
          </Link>
          <a
            href="mailto:admin@hnchat.net?subject=Account%20recovery"
            className="block rounded-lg border border-border px-4 py-3 hover:border-primary/50 hover:bg-primary/5 transition"
          >
            <div className="font-medium">Contact support</div>
            <div className="text-xs text-muted-foreground">Email admin@hnchat.net for manual recovery.</div>
          </a>
          <Link
            to="/login"
            className="block rounded-lg border border-border px-4 py-3 hover:border-primary/50 hover:bg-primary/5 transition"
          >
            <div className="font-medium">Back to sign in</div>
            <div className="text-xs text-muted-foreground">Try logging in again.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
