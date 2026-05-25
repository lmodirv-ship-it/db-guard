import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/billing")({
  head: () => ({ meta: [{ title: "Billing — DB·GUARD" }] }),
  component: Billing,
});

type Plan = { id: string; name: string; price_monthly: string; features: string[] };
type Usage = { plan: { id: string; name: string }; usage: { tables: number; records: number; api_keys: number; team: number } };

function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  useEffect(() => {
    fetch("/api/billing/plans").then((r) => r.json()).then((j) => j.ok && setPlans(j.plans));
    fetch("/api/billing/usage").then((r) => r.json()).then((j) => j.ok && setUsage(j));
  }, []);
  return (
    <DashboardShell title="Billing & Plans">
      {usage && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="text-xs uppercase text-muted-foreground tracking-wider">Current plan</div>
          <div className="text-2xl font-bold mt-1">{usage.plan.name}</div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = usage?.plan.id === p.id;
          return (
            <div key={p.id} className={`rounded-xl border p-6 ${isCurrent ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <h3 className="font-semibold">{p.name}</h3>
              <div className="my-4">
                <span className="text-3xl font-bold">${p.price_monthly}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
              <ul className="space-y-1.5 mb-4">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <button disabled={isCurrent} className={`w-full rounded-md py-2 text-sm font-medium ${isCurrent ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                {isCurrent ? "Current plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
