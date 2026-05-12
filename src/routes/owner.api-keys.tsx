import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — DB·GUARD" }] }),
  component: () => (
    <div>
      <PageHeader title="API Keys" subtitle="إنشاء وإدارة مفاتيح الـ API الخاصة بك." />
      <ComingSoon feature="API Key Management" />
    </div>
  ),
});
