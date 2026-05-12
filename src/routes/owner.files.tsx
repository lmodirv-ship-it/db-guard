import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/owner/PageShell";

export const Route = createFileRoute("/owner/files")({
  head: () => ({ meta: [{ title: "Files — DB·GUARD" }] }),
  component: () => (
    <div>
      <PageHeader title="Files" subtitle="إدارة الملفات والتخزين السحابي." />
      <ComingSoon feature="File Storage Manager" />
    </div>
  ),
});
