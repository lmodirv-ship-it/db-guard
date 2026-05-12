import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/jobs")({
  head: () => ({ meta: [{ title: "Jobs — DB·GUARD" }] }),
  component: () => (
    <div>
      <PageHeader title="Jobs" subtitle="مهام الخلفية وقوائم الانتظار." />
      <ComingSoon feature="Jobs Queue Monitor" />
    </div>
  ),
});
