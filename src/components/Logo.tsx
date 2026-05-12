import logoImg from "@/assets/db-guard-logo.jpg";
import { Link } from "@tanstack/react-router";

export function Logo({ size = 36, showText = true, animated = false }: { size?: number; showText?: boolean; animated?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3 group">
      <div className="relative">
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent blur-xl opacity-50 group-hover:opacity-80 transition-opacity ${animated ? "animate-pulse-glow" : ""}`}
        />
        <img
          src={logoImg}
          alt="DB Guard"
          width={size}
          height={size}
          className="relative rounded-xl object-cover"
          style={{ width: size, height: size }}
        />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-brand text-lg font-extrabold tracking-wider text-foreground">
            DB<span className="text-primary">·</span>GUARD
          </span>
          <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground mt-0.5">
            SECURE · ISOLATE · SCALE
          </span>
        </div>
      )}
    </Link>
  );
}
