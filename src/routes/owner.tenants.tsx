import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/tenants")({
  head: () => ({ meta: [{ title: "Tenants — DB·GUARD" }] }),
  component: () => (
    <div>
      <PageHeader title="Tenants" subtitle="إدارة المؤسسات والعزل بين البيئات." />
      <ComingSoon feature="Multi-Tenant Manager" />
    </div>
  ),
});
