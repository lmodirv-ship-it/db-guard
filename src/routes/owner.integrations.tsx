import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/integrations")({
  head: () => ({ meta: [{ title: "Integrations — DB·GUARD" }] }),
  component: () => (
    <div>
      <PageHeader title="Integrations" subtitle="ربط المنصة بخدماتك الخارجية المفضلة." />
      <ComingSoon feature="Third-Party Integrations" />
    </div>
  ),
});
