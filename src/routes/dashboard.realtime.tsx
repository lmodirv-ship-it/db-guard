import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CyberCard, StatPill, PulseDot } from "@/components/dashboard/CyberCard";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { Radio, Wifi, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/dashboard/realtime")({
  head: () => ({ meta: [{ title: "Realtime — DB·GUARD" }] }),
  component: Page,
});

type Event = { id: number; channel: string; type: string; payload: string; at: string };

const CHANNELS = ["public:users", "public:orders", "public:events", "public:sessions", "private:billing"];
const TYPES = ["INSERT", "UPDATE", "DELETE", "PRESENCE", "BROADCAST"];

function randomEvent(id: number): Event {
  const c = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
  const t = TYPES[Math.floor(Math.random() * TYPES.length)];
  const samples: Record<string, string> = {
    INSERT: `{ id: "rec_${Math.random().toString(36).slice(2, 8)}", created: now() }`,
    UPDATE: `{ status: "active", last_seen: now() }`,
    DELETE: `{ id: "rec_${Math.random().toString(36).slice(2, 8)}" }`,
    PRESENCE: `{ user: "u_${Math.random().toString(36).slice(2, 6)}", state: "online" }`,
    BROADCAST: `{ room: "lobby", message: "ping" }`,
  };
  return { id, channel: c, type: t, payload: samples[t], at: new Date().toLocaleTimeString([], { hour12: false }) };
}

function Page() {
  const [events, setEvents] = useState<Event[]>(() => Array.from({ length: 8 }, (_, i) => randomEvent(i)));
  const [sockets, setSockets] = useState(1284);

  useEffect(() => {
    const id = setInterval(() => {
      setEvents((e) => {
        const next = randomEvent(e.length === 0 ? 0 : e[0].id + 1);
        return [next, ...e].slice(0, 40);
      });
      setSockets((s) => Math.max(800, s + Math.round((Math.random() - 0.5) * 30)));
    }, 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <DashboardShell title="Realtime">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <CyberCard glow>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Active sockets</span>
              <Wifi className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold"><AnimatedCounter value={sockets} /></div>
            <div className="flex items-center gap-1.5 text-[11px] text-success mt-1"><PulseDot /> live</div>
          </div>
        </CyberCard>
        {[
          { l: "Channels", v: 24, i: Radio },
          { l: "Online users", v: 318, i: Users },
          { l: "Msgs / sec", v: 142, i: Zap },
        ].map((k) => {
          const Icon = k.i;
          return (
            <CyberCard key={k.l}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">{k.l}</span>
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div className="text-3xl font-bold"><AnimatedCounter value={k.v} /></div>
              </div>
            </CyberCard>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CyberCard className="lg:col-span-2">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Radio className="h-4 w-4 text-primary" /> Live event stream</h3>
            <StatPill tone="success">streaming</StatPill>
          </div>
          <div className="max-h-[34rem] overflow-y-auto p-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-3 py-2 border-b border-border/50 last:border-0 animate-fade-in">
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-16">{e.at}</span>
                <span className={`font-mono text-[10px] uppercase rounded px-1.5 py-0.5 shrink-0 ${
                  e.type === "INSERT" ? "bg-success/15 text-success" :
                  e.type === "DELETE" ? "bg-destructive/15 text-destructive" :
                  e.type === "UPDATE" ? "bg-primary/15 text-primary" :
                  "bg-accent/15 text-accent"
                }`}>{e.type}</span>
                <span className="font-mono text-xs text-foreground/80 shrink-0">{e.channel}</span>
                <span className="font-mono text-xs text-muted-foreground truncate flex-1">{e.payload}</span>
              </div>
            ))}
          </div>
        </CyberCard>

        <CyberCard>
          <div className="p-4 border-b border-primary/10">
            <h3 className="font-semibold">Channels</h3>
          </div>
          <div className="p-3 space-y-2">
            {CHANNELS.map((c, i) => (
              <div key={c} className="flex items-center justify-between rounded-md border border-border bg-card/40 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PulseDot tone={i === 4 ? "warn" : "success"} />
                  <span className="font-mono text-xs truncate">{c}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{Math.floor(Math.random() * 800 + 50)}</span>
              </div>
            ))}
          </div>
        </CyberCard>
      </div>
    </DashboardShell>
  );
}
