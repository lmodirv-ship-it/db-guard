import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield, Database, Lock, Zap, ArrowRight, ShieldCheck,
  MessageCircle, Car, ShoppingCart, Camera, PlayCircle, Activity, Server, Globe, KeyRound, Cpu,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HN Account — Unified identity for HN Chat, Driver, Souk, Studio, Video AI & DB·GUARD" },
      { name: "description", content: "One HN Account unlocks every HN service. Cyberpunk-grade security, isolated workspaces, and the DB·GUARD database engine." },
      { property: "og:title", content: "HN Account — One identity for the HN universe" },
      { property: "og:description", content: "Unified login across HN Chat, Driver, Souk, Studio, Video AI and DB·GUARD." },
    ],
  }),
  component: Landing,
});

const APPS = [
  { name: "HN Chat", icon: MessageCircle, color: "oklch(0.72 0.2 50)", desc: "Realtime conversations" },
  { name: "HN Driver", icon: Car, color: "oklch(0.7 0.2 240)", desc: "Mobility platform" },
  { name: "HN Souk", icon: ShoppingCart, color: "oklch(0.7 0.25 0)", desc: "Marketplace" },
  { name: "HN Studio", icon: Camera, color: "oklch(0.65 0.27 310)", desc: "Creator studio" },
  { name: "HN Video AI", icon: PlayCircle, color: "oklch(0.65 0.25 25)", desc: "Generative video" },
  { name: "DB·GUARD", icon: Database, color: "oklch(0.7 0.18 195)", desc: "Database engine" },
];

function Landing() {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden text-foreground"
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, oklch(0.22 0.06 80 / 0.3), transparent 55%), radial-gradient(ellipse at 80% 100%, oklch(0.18 0.08 280 / 0.5), transparent 60%), oklch(0.07 0.02 270)",
      }}
    >
      {/* Animated grid */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.85 0.18 90 / 0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.18 90 / 0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
        }} />
      {/* Floating orbs */}
      <div aria-hidden className="pointer-events-none fixed -top-40 -left-40 h-[28rem] w-[28rem] rounded-full -z-10"
        style={{ background: "radial-gradient(circle, oklch(0.85 0.18 85 / 0.18), transparent 70%)", animation: "hn-pulse 8s ease-in-out infinite" }} />
      <div aria-hidden className="pointer-events-none fixed -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full -z-10"
        style={{ background: "radial-gradient(circle, oklch(0.6 0.27 295 / 0.2), transparent 70%)", animation: "hn-pulse 10s ease-in-out infinite reverse" }} />

      {/* Particles */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i}
            className="absolute h-1 w-1 rounded-full"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 31) % 100}%`,
              background: i % 3 === 0 ? "oklch(0.85 0.18 85 / 0.7)" : "oklch(0.7 0.22 280 / 0.6)",
              boxShadow: "0 0 8px currentColor",
              animation: `hn-particle ${8 + (i % 5)}s linear infinite`,
              animationDelay: `${i * 0.4}s`,
            }} />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ borderColor: "oklch(0.85 0.18 85 / 0.15)", background: "oklch(0.07 0.02 270 / 0.65)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl font-brand text-sm font-black"
              style={{
                background: "linear-gradient(135deg, oklch(0.92 0.18 90), oklch(0.7 0.22 55))",
                color: "oklch(0.13 0.02 270)",
                boxShadow: "0 0 28px oklch(0.85 0.18 85 / 0.55)",
              }}>HN</div>
            <div className="font-brand text-sm font-bold tracking-[0.25em]" style={{ color: "oklch(0.88 0.18 85)" }}>
              HN ACCOUNT
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition">Services</a>
            <a href="#dbguard" className="hover:text-foreground transition">DB·GUARD</a>
            <a href="#unified" className="hover:text-foreground transition">Unified</a>
            <a href="#security" className="hover:text-foreground transition">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition">Login</Link>
            <Link to="/register"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition"
              style={{
                background: "linear-gradient(135deg, oklch(0.92 0.18 90), oklch(0.7 0.22 55))",
                color: "oklch(0.13 0.02 270)",
                boxShadow: "0 10px 30px -10px oklch(0.85 0.18 85 / 0.6)",
              }}>
              Create Account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-widest"
              style={{ borderColor: "oklch(0.85 0.18 85 / 0.4)", color: "oklch(0.88 0.18 85)" }}>
              <ShieldCheck className="h-3.5 w-3.5" /> One key for the HN universe
            </div>
            <h1 className="mt-5 font-brand text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
              style={{
                background: "linear-gradient(135deg, oklch(0.95 0.05 90), oklch(0.85 0.18 85), oklch(0.7 0.22 55))",
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              }}>
              The unified identity<br />for HN.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Sign up once with HN Account and unlock HN Chat, Driver, Souk, Studio, Video AI, and the DB·GUARD database engine — each with its own isolated workspace and admin dashboard.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register"
                className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold transition"
                style={{
                  background: "linear-gradient(135deg, oklch(0.92 0.18 90), oklch(0.7 0.22 55))",
                  color: "oklch(0.13 0.02 270)",
                  boxShadow: "0 18px 40px -10px oklch(0.85 0.18 85 / 0.7), 0 0 50px -10px oklch(0.85 0.18 85 / 0.5)",
                }}>
                Create Account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login"
                className="inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-sm font-bold transition hover:bg-foreground/5"
                style={{ borderColor: "oklch(0.85 0.18 85 / 0.45)", color: "oklch(0.88 0.18 85)" }}>
                Login
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
              {[
                { v: "AES-256", l: "Encrypted at rest" },
                { v: "Isolated", l: "Per-tenant DB" },
                { v: "24/7", l: "Edge support" },
              ].map((s) => (
                <div key={s.v} className="rounded-xl border p-3 text-center backdrop-blur"
                  style={{ borderColor: "oklch(0.85 0.18 85 / 0.18)", background: "oklch(0.12 0.03 270 / 0.5)" }}>
                  <div className="font-mono text-base font-bold" style={{ color: "oklch(0.88 0.18 85)" }}>{s.v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative h-[500px]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex h-44 w-44 items-center justify-center rounded-3xl"
                style={{
                  background: "linear-gradient(135deg, oklch(0.88 0.18 85), oklch(0.68 0.2 55))",
                  boxShadow: "0 0 100px oklch(0.85 0.18 85 / 0.6), 0 0 0 1px oklch(0.85 0.18 85 / 0.5) inset",
                  animation: "hn-pulse 4s ease-in-out infinite",
                }}>
                <ShieldCheck className="h-24 w-24" style={{ color: "oklch(0.13 0.02 270)" }} />
              </div>
            </div>
            {APPS.map((app, i) => {
              const angle = (i / APPS.length) * Math.PI * 2 - Math.PI / 2;
              const r = 200;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              const Icon = app.icon;
              return (
                <div key={app.name}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    animation: `hn-float 5s ease-in-out infinite ${i * 0.4}s`,
                  }}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border backdrop-blur"
                      style={{
                        background: `linear-gradient(135deg, ${app.color}, oklch(0.18 0.04 270))`,
                        borderColor: app.color,
                        boxShadow: `0 0 30px ${app.color}88`,
                      }}>
                      <Icon className="h-8 w-8" style={{ color: "oklch(0.98 0 0)" }} />
                    </div>
                    <span className="text-[11px] font-semibold">{app.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.3em]" style={{ color: "oklch(0.85 0.18 85)" }}>The HN ecosystem</div>
          <h2 className="mt-3 font-brand text-4xl font-black tracking-tight">Six services. One account.</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Every HN product is built on the same identity layer. Sign in once with your HN Account and access them all.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              <div key={app.name}
                className="group relative overflow-hidden rounded-2xl border p-6 backdrop-blur transition hover:-translate-y-1"
                style={{ borderColor: "oklch(0.85 0.18 85 / 0.18)", background: "oklch(0.12 0.03 270 / 0.6)" }}>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: `linear-gradient(135deg, ${app.color}, oklch(0.18 0.04 270))`, boxShadow: `0 0 30px ${app.color}66` }}>
                  <Icon className="h-7 w-7" style={{ color: "oklch(0.98 0 0)" }} />
                </div>
                <h3 className="font-brand text-xl font-bold">{app.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{app.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* DB·GUARD */}
      <section id="dbguard" className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="rounded-3xl border p-8 backdrop-blur"
            style={{
              borderColor: "oklch(0.7 0.18 195 / 0.4)",
              background: "linear-gradient(180deg, oklch(0.18 0.06 200 / 0.5), oklch(0.1 0.02 270 / 0.7))",
              boxShadow: "0 0 80px -10px oklch(0.7 0.18 195 / 0.35)",
            }}>
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8" style={{ color: "oklch(0.78 0.18 195)" }} />
              <span className="font-brand text-xs tracking-[0.3em]" style={{ color: "oklch(0.78 0.18 195)" }}>DB·GUARD</span>
            </div>
            <h3 className="mt-4 font-brand text-3xl font-black">The HN Database Engine.</h3>
            <p className="mt-3 text-muted-foreground">
              Every HN account ships with an isolated, private database — provisioned automatically the moment you verify your email. Tables, records, API keys, monitoring and security audits, all in one cyberpunk-grade control plane.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "Per-tenant database with hard isolation",
                "Real-time monitoring and audit logs",
                "REST API & SQL playground out of the box",
                "Automated backups and point-in-time restore",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "oklch(0.78 0.18 195)" }} />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { i: Server, l: "Edge runtime", v: "12 regions" },
              { i: Lock, l: "Encryption", v: "AES-256" },
              { i: Activity, l: "Uptime", v: "99.99%" },
              { i: Cpu, l: "Engine", v: "HN DB v3" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border p-5 backdrop-blur"
                style={{ borderColor: "oklch(0.85 0.18 85 / 0.18)", background: "oklch(0.12 0.03 270 / 0.5)" }}>
                <s.i className="h-6 w-6" style={{ color: "oklch(0.85 0.18 85)" }} />
                <div className="mt-3 font-mono text-2xl font-bold" style={{ color: "oklch(0.88 0.18 85)" }}>{s.v}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unified system */}
      <section id="unified" className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.3em]" style={{ color: "oklch(0.85 0.18 85)" }}>How it works</div>
          <h2 className="mt-3 font-brand text-4xl font-black tracking-tight">A single identity, everywhere.</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { i: KeyRound, t: "Create your HN Code", d: "Format HN-XXXXXX. The master key for every HN service." },
            { i: Globe, t: "Auto-provisioned tenant", d: "Workspace, primary database, and API key created instantly." },
            { i: Zap, t: "One-click sign-in", d: "Move between HN apps without re-authenticating, ever." },
          ].map((s) => (
            <div key={s.t} className="rounded-2xl border p-6 backdrop-blur"
              style={{ borderColor: "oklch(0.85 0.18 85 / 0.2)", background: "oklch(0.12 0.03 270 / 0.55)" }}>
              <s.i className="h-7 w-7" style={{ color: "oklch(0.85 0.18 85)" }} />
              <h3 className="mt-4 font-brand text-lg font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl border p-10 text-center backdrop-blur"
          style={{
            borderColor: "oklch(0.85 0.18 85 / 0.3)",
            background: "linear-gradient(180deg, oklch(0.16 0.04 270 / 0.7), oklch(0.08 0.02 270 / 0.85))",
            boxShadow: "0 0 100px -20px oklch(0.85 0.18 85 / 0.3)",
          }}>
          <Shield className="mx-auto h-12 w-12" style={{ color: "oklch(0.88 0.18 85)" }} />
          <h2 className="mt-4 font-brand text-3xl font-black tracking-tight">Cyberpunk-grade security</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            OTP email verification, hashed passwords, isolated tenants, API keys shown once, and audit logs on every action.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold transition"
              style={{
                background: "linear-gradient(135deg, oklch(0.92 0.18 90), oklch(0.7 0.22 55))",
                color: "oklch(0.13 0.02 270)",
                boxShadow: "0 18px 40px -10px oklch(0.85 0.18 85 / 0.7)",
              }}>
              Create Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-sm font-bold transition hover:bg-foreground/5"
              style={{ borderColor: "oklch(0.85 0.18 85 / 0.45)", color: "oklch(0.88 0.18 85)" }}>
              Login
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-10 text-center text-xs text-muted-foreground"
        style={{ borderColor: "oklch(0.85 0.18 85 / 0.12)" }}>
        <div className="mx-auto max-w-7xl px-6">
          HN Account · One identity for HN Chat, HN Driver, HN Souk, HN Studio, HN Video AI and DB·GUARD.
        </div>
      </footer>

      <style>{`
        @keyframes hn-float { 0%,100%{transform:translate(calc(-50% + var(--x,0)*1px), calc(-50% + var(--y,0)*1px));} 50%{transform:translate(calc(-50% + var(--x,0)*1px), calc(-50% + var(--y,0)*1px - 8px));} }
        @keyframes hn-pulse { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(1.05);opacity:1} }
        @keyframes hn-particle { 0%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateY(-100vh) translateX(40px);opacity:0} }
      `}</style>
    </div>
  );
}
