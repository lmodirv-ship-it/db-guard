import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/roles")({
  head: () => ({ meta: [{ title: "Roles — DB·GUARD" }] }),
  component: () => (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="إعداد الأدوار والصلاحيات الدقيقة." />
      <ComingSoon feature="RBAC Roles" />
    </div>
  ),
});
