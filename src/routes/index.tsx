import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import logoImg from "@/assets/db-guard-logo.jpg";
import {
  Shield, Database, Brain, Cloud, Lock, Activity,
  Zap, BarChart3, Bell, KeyRound, Users, CheckCircle2, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DB·GUARD — AI-Powered Database Security Platform" },
      { name: "description", content: "Secure · Isolate · Scale. Multi-tenant database security with AI-powered threat detection, real-time analytics, and enterprise-grade compliance." },
      { property: "og:title", content: "DB·GUARD — AI-Powered Database Security" },
      { property: "og:description", content: "Enterprise database security with AI threat detection and multi-tenant isolation." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Glow background */}
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--gradient-glow)" }} />
      <div className="pointer-events-none fixed inset-0 -z-10 cyber-grid" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 backdrop-blur-xl bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#security" className="hover:text-foreground transition">Security</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <Link to="/dashboard" className="hover:text-foreground transition">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90 transition"
              style={{ background: "var(--gradient-primary)" }}
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono tracking-wider text-primary mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              AI-POWERED · MULTI-TENANT · ENTERPRISE
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
              AI-Powered<br />
              <span className="text-gradient">Database Security</span><br />
              Platform
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Protect, isolate and scale your data with enterprise-grade multi-tenant architecture,
              real-time threat detection, and an AI assistant that understands your stack.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] transition"
                style={{ background: "var(--gradient-primary)" }}
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-border glass px-6 py-3.5 font-semibold hover:border-primary/50 transition"
              >
                View Dashboard
              </Link>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg">
              {[
                { v: "1,234", l: "Threats Blocked" },
                { v: "99.99%", l: "Uptime" },
                { v: "100%", l: "Compliant" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-3xl font-bold text-gradient">{s.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3D Logo */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-[420px] w-[420px] rounded-full blur-3xl opacity-60" style={{ background: "var(--gradient-primary)" }} />
            <img
              src={logoImg}
              alt="DB Guard 3D logo"
              className="relative w-[380px] h-[380px] rounded-3xl object-cover animate-float shadow-[var(--shadow-glow)]"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-xs tracking-[0.3em] text-primary mb-3">CORE CAPABILITIES</p>
          <h2 className="text-4xl md:text-5xl font-bold">Everything you need to <span className="text-gradient">protect your data</span></h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { i: Shield, t: "Multi-Tenant Isolation", d: "Application-level WHERE clauses + Postgres RLS. Zero cross-tenant leaks." },
            { i: Brain, t: "AI Threat Detection", d: "Anomaly detection, SQL injection prevention, behavioral analysis." },
            { i: Activity, t: "Real-Time Analytics", d: "Live dashboards for queries, performance and security posture." },
            { i: Lock, t: "Audit Logs", d: "Tamper-proof audit trail of every privileged action." },
            { i: KeyRound, t: "API Key Management", d: "Scoped tokens, rotation policies, instant revocation." },
            { i: Cloud, t: "Cloud Storage Metrics", d: "Per-tenant storage, bandwidth and quota tracking." },
            { i: Users, t: "Role-Based Access", d: "Owner / Admin / Member roles with granular permissions." },
            { i: CheckCircle2, t: "Compliance Monitoring", d: "SOC 2 + GDPR ready with continuous compliance scoring." },
            { i: Bell, t: "Automated Alerts", d: "Smart alerts for threats, failures and unusual activity." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="group relative rounded-2xl glass p-6 hover:border-primary/40 transition">
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition" style={{ background: "var(--gradient-glow)" }} />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary mb-4 ring-1 ring-primary/30">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard preview */}
      <section id="security" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="font-mono text-xs tracking-[0.3em] text-accent mb-3">LIVE DASHBOARD</p>
          <h2 className="text-4xl md:text-5xl font-bold">Mission control for your <span className="text-gradient">entire data stack</span></h2>
        </div>
        <div className="rounded-2xl glass p-2 shadow-[var(--shadow-glow)]">
          <div className="rounded-xl bg-card/80 p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { i: Database, l: "Total Databases", v: "356", c: "+8.7%" },
                { i: Users, l: "Active Users", v: "842", c: "+15.3%" },
                { i: Shield, l: "Threats Blocked", v: "1,234", c: "−4.2%" },
                { i: BarChart3, l: "Compliance", v: "98%", c: "+2.4%" },
              ].map(({ i: Icon, l, v, c }) => (
                <div key={l} className="rounded-xl border border-border/60 bg-background/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">{l}</span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{v}</div>
                  <div className="text-xs text-success mt-1">{c} from last month</div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 rounded-xl border border-border/60 bg-background/40 p-6 h-64 flex items-center justify-center">
                <div className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Platform Activity</span>
                    <span className="text-xs text-muted-foreground font-mono">Last 7 days</span>
                  </div>
                  <svg viewBox="0 0 400 140" className="w-full h-32">
                    <defs>
                      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.62 0.27 295)" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="oklch(0.62 0.27 295)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,100 L40,80 L80,90 L120,60 L160,70 L200,40 L240,55 L280,30 L320,45 L360,20 L400,25 L400,140 L0,140 Z" fill="url(#g1)" />
                    <path d="M0,100 L40,80 L80,90 L120,60 L160,70 L200,40 L240,55 L280,30 L320,45 L360,20 L400,25" fill="none" stroke="oklch(0.7 0.2 295)" strokeWidth="2" />
                    <path d="M0,120 L40,110 L80,115 L120,100 L160,105 L200,90 L240,95 L280,80 L320,85 L360,70 L400,75" fill="none" stroke="oklch(0.7 0.2 230)" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-6 flex flex-col items-center justify-center">
                <div className="relative h-32 w-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.3 0.04 280)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.72 0.2 155)" strokeWidth="8" strokeDasharray="263" strokeDashoffset="5" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">98%</span>
                    <span className="text-[10px] text-success">Excellent</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Security Posture</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-xs tracking-[0.3em] text-primary mb-3">SIMPLE · TRANSPARENT</p>
          <h2 className="text-4xl md:text-5xl font-bold">Choose your <span className="text-gradient">plan</span></h2>
          <p className="mt-4 text-muted-foreground">All plans include enterprise security, multi-tenancy and 24/7 monitoring.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { n: "Free", p: "$0", d: "Get started", f: ["1 Tenant", "1 User", "1 Project", "1 GB Storage"], cta: "Get Started" },
            { n: "Starter", p: "$29", d: "Small teams", f: ["1 Tenant", "5 Users", "10 Projects", "50 GB Storage"], cta: "Start Trial" },
            { n: "Pro", p: "$99", d: "Growing business", f: ["Unlimited Tenants", "20 Users", "200 GB Storage", "AI Assistant"], cta: "Start Trial", featured: true },
            { n: "Enterprise", p: "Custom", d: "Mission-critical", f: ["Unlimited Everything", "SSO / SAML", "Dedicated Support", "SLA"], cta: "Contact Sales" },
          ].map((t) => (
            <div key={t.n} className={`relative rounded-2xl p-6 ${t.featured ? "neon-border bg-card" : "glass"}`}>
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  MOST POPULAR
                </div>
              )}
              <h3 className="font-semibold text-lg">{t.n}</h3>
              <p className="text-xs text-muted-foreground">{t.d}</p>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">{t.p}</span>
                {t.p !== "Custom" && <span className="text-muted-foreground text-sm">/mo</span>}
              </div>
              <ul className="space-y-2 mb-6">
                {t.f.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`block text-center rounded-lg py-2.5 text-sm font-medium transition ${t.featured ? "text-primary-foreground hover:opacity-90" : "border border-border hover:border-primary/50"}`}
                style={t.featured ? { background: "var(--gradient-primary)" } : {}}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative rounded-3xl glass p-12 md:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-glow)" }} />
          <div className="relative">
            <Zap className="h-12 w-12 mx-auto mb-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold">Protect your data. <span className="text-gradient">Empower your future.</span></h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">The next generation of database security is here. Join the teams already running on DB·GUARD.</p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-primary-foreground shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-border glass px-6 py-3.5 font-semibold">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={32} />
          <p className="text-xs text-muted-foreground font-mono">© 2026 DB·GUARD — SECURE · ISOLATE · SCALE</p>
        </div>
      </footer>
    </div>
  );
}
