import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/alerts")({
  head: () => ({ meta: [{ title: "Alerts — DB·GUARD" }] }),
  component: () => (
    <div>
      <PageHeader title="Alerts" subtitle="إعداد التنبيهات والإشعارات الذكية." />
      <ComingSoon feature="Alert Rules Engine" />
    </div>
  ),
});
