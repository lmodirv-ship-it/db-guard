import type { ReactNode } from "react";

export function CyberCard({
  children,
  className = "",
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border border-primary/15 bg-card/60 backdrop-blur-sm overflow-hidden ${
        glow ? "shadow-[0_0_40px_-15px_var(--primary)]" : ""
      } ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      {children}
    </div>
  );
}

export function StatPill({
  tone = "primary",
  children,
}: {
  tone?: "primary" | "success" | "warn" | "danger" | "muted";
  children: ReactNode;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary border-primary/30",
    success: "bg-success/10 text-success border-success/30",
    warn: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PulseDot({ tone = "success" }: { tone?: "success" | "warn" | "danger" }) {
  const c = tone === "success" ? "bg-success" : tone === "warn" ? "bg-amber-400" : "bg-destructive";
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inset-0 animate-ping rounded-full ${c} opacity-60`} />
      <span className={`relative h-2 w-2 rounded-full ${c}`} />
    </span>
  );
}
