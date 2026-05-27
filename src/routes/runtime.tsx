import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/runtime")({
  head: () => ({ meta: [{ title: "Runtime — HN-DB" }] }),
  component: () => <Outlet />,
});
