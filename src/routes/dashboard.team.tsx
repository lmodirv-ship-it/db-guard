import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/dashboard/team")({
  head: () => ({ meta: [{ title: "Team — DB·GUARD" }] }),
  component: Team,
});

type Member = { id: string; email: string; name: string | null; role: string };
type Invite = { id: string; email: string; role: string; created_at: string };

function Team() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  async function refresh() {
    const r = await fetch("/api/team");
    const j = await r.json();
    if (j.ok) { setMembers(j.members); setInvites(j.invites); }
  }
  useEffect(() => { refresh(); }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
    setEmail(""); await refresh();
  }

  return (
    <DashboardShell title="Team">
      <form onSubmit={invite} className="mb-6 flex gap-2">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@example.com" className="flex-1 rounded-md border border-border bg-input px-3 py-2" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-border bg-input px-3 py-2">
          <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option><option value="member">Member</option>
        </select>
        <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"><UserPlus className="h-4 w-4" /> Invite</button>
      </form>
      <h3 className="font-semibold mb-2 text-sm">Members</h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
        <table className="w-full text-sm">
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{m.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.name ?? "—"}</td>
                <td className="px-4 py-3 text-right"><span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{m.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {invites.length > 0 && (
        <>
          <h3 className="font-semibold mb-2 text-sm">Pending invites</h3>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{i.email}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{i.role}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
