import { createFileRoute, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DB Guard — Smart Project Generator" },
      {
        name: "description",
        content:
          "Verify, analyze and import any website into a tenant-isolated database. Built for Cloudflare Workers + Neon.",
      },
      { property: "og:title", content: "DB Guard — Smart Project Generator" },
      {
        property: "og:description",
        content: "URL → Verification → Analysis → Schema → Import. Zero-trust, multi-tenant.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-sm font-semibold tracking-tight">
            ▣ db-guard
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="mb-4 inline-block rounded-full border border-border bg-muted px-3 py-1 font-mono text-xs">
            multi-tenant · Workers · Neon · R2 · Queues
          </p>
          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            Turn any website into a{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              tenant-isolated database
            </span>
            .
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Drop a URL. We verify ownership three ways, analyze the structure, generate a schema, and
            import the data — every byte sealed inside your tenant by application WHERE clauses{" "}
            <em>and</em> Postgres RLS.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90"
            >
              Create free account
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-border px-5 py-2.5 font-medium hover:bg-muted"
            >
              I already have an account
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Verify ownership",
              d: ".well-known file → DNS TXT → meta tag. First wins.",
            },
            { t: "Smart analysis", d: "OpenGraph, JSON-LD, schema inference, sample crawl." },
            { t: "Parallel jobs", d: "Cloudflare Queues, 10 concurrent workers, auto-retry + DLQ." },
          ].map((f) => (
            <div key={f.t} className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// re-export to satisfy linter if redirect is unused later
export { redirect };
