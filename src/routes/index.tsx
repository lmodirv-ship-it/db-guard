import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Smart Project Generator — turn any URL into a structured dataset" },
      {
        name: "description",
        content:
          "Verify ownership of any website, auto-detect its schema, and import structured data into your private workspace.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">Smart Generator</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
          Any URL → structured data, on your terms.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Verify the site you own, generate its schema automatically, and import
          records into a private, isolated workspace. Multi-tenant, secured by
          row-level isolation, runs on the edge.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            to="/signup"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create your workspace
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent"
          >
            Log in
          </Link>
        </div>

        <div className="mt-20 grid gap-6 text-left md:grid-cols-3">
          {[
            {
              t: "Ownership-first",
              d: "Three-way verification (well-known file, DNS TXT, meta tag).",
            },
            {
              t: "Auto schema",
              d: "JSON-LD, OpenGraph, and heuristic detection generate your model.",
            },
            {
              t: "Tenant-isolated",
              d: "Application WHERE + Postgres RLS + per-tenant storage prefix.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-lg border border-border bg-card p-5 text-card-foreground"
            >
              <div className="text-sm font-semibold">{c.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
