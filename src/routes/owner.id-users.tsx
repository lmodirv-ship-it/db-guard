import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Users as UsersIcon } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/owner/PageShell";

type IdUser = {
  id: string;
  login_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/owner/id-users")({
  head: () => ({ meta: [{ title: "ID Users — DB·GUARD" }] }),
  component: IdUsersPage,
});

function IdUsersPage() {
  const [users, setUsers] = useState<IdUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/id-users");
        const j = (await r.json()) as { ok: boolean; users?: IdUser[]; error?: string };
        if (!j.ok) {
          setError(j.error ?? "load_failed");
          setUsers([]);
        } else {
          setUsers(j.users ?? []);
        }
      } catch {
        setError("network_error");
        setUsers([]);
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="ID Users"
        subtitle="المستخدمون المسجلون عبر نظام رقم الـID المؤقت."
      />

      <Panel
        title="القائمة"
        right={
          <span className="text-xs text-muted-foreground">
            {users ? `${users.length} مستخدم` : ""}
          </span>
        }
      >
        {users === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="لا يوجد مستخدمون بعد"
            description="سيظهر هنا كل من سجل عبر صفحة /quick"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/50">
                  <th className="py-2 text-left font-medium">Login ID</th>
                  <th className="py-2 text-left font-medium">Name</th>
                  <th className="py-2 text-left font-medium">Email</th>
                  <th className="py-2 text-left font-medium">Phone</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/30">
                    <td className="py-2 font-mono text-primary">{u.login_id}</td>
                    <td className="py-2">{u.full_name}</td>
                    <td className="py-2 text-muted-foreground">{u.email}</td>
                    <td className="py-2 text-muted-foreground">{u.phone ?? "—"}</td>
                    <td className="py-2">
                      <span className="rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px]">
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
