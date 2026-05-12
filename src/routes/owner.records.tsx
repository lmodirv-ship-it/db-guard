import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/records")({
  head: () => ({ meta: [{ title: "Records — DB·GUARD" }] }),
  component: () => (
    <div>
      <PageHeader title="Records" subtitle="استعراض وإدارة جميع السجلات عبر المشاريع." />
      <ComingSoon feature="Records Explorer" />
    </div>
  ),
});
