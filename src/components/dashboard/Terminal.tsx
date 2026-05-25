import { useEffect, useState } from "react";
import { mockTerminalLines } from "@/lib/mock/enterprise";

export function Terminal() {
  const [lines, setLines] = useState(mockTerminalLines());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setLines((prev) => {
        const samples = mockTerminalLines();
        const next = samples[Math.floor(Math.random() * samples.length)];
        const ts = new Date().toLocaleTimeString([], { hour12: false });
        return [...prev.slice(-12), { ...next, ts }];
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-xl border border-primary/20 bg-[oklch(0.1_0.02_270)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-primary/15 px-3 py-1.5 bg-black/40">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          db-guard@control:~# live —streaming ({tick})
        </span>
        <span className="w-10" />
      </div>
      <div className="font-mono text-[11px] leading-relaxed p-3 space-y-0.5 max-h-64 overflow-y-auto">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted-foreground/60 shrink-0">{l.ts}</span>
            <span
              className={
                l.level === "error"
                  ? "text-destructive shrink-0"
                  : l.level === "warn"
                    ? "text-amber-400 shrink-0"
                    : "text-accent shrink-0"
              }
            >
              {l.level.toUpperCase().padEnd(5)}
            </span>
            <span className="text-foreground/85">{l.msg}</span>
          </div>
        ))}
        <div className="flex gap-2 text-foreground/85">
          <span className="text-primary">db-guard@control:~$</span>
          <span className="animate-pulse">▊</span>
        </div>
      </div>
    </div>
  );
}
