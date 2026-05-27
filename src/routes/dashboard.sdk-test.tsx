import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

type AnyObj = Record<string, unknown>;
type LogEntry = { ts: number; kind: "in" | "out" | "err"; label: string; data: unknown };

declare global {
  interface Window {
    HN?: {
      ready: Promise<unknown> | null;
      site: string;
      user: AnyObj | null;
      config: AnyObj | null;
      version: string;
      auth: {
        signup: (e: string, p: string, n?: string) => Promise<AnyObj>;
        login: (e: string, p: string) => Promise<AnyObj>;
        logout: () => Promise<AnyObj>;
        me: () => Promise<AnyObj | null>;
        token: () => string | null;
      };
      db: {
        list: (c: string, o?: { limit?: number; offset?: number }) => Promise<AnyObj>;
        insert: (c: string, d: AnyObj) => Promise<AnyObj>;
        update: (c: string, id: string, d: AnyObj) => Promise<AnyObj>;
        delete: (c: string, id: string) => Promise<AnyObj>;
      };
      storage: {
        upload: (f: File, o?: AnyObj) => Promise<AnyObj>;
        list: (o?: { limit?: number }) => Promise<AnyObj>;
        delete: (id: string) => Promise<AnyObj>;
        url: (id: string) => string;
      };
      permissions: { list: () => Promise<AnyObj>; has: (c: string) => Promise<boolean> };
      analytics: { track: (e: string, p?: AnyObj) => void };
    };
  }
}

export const Route = createFileRoute("/dashboard/sdk-test")({
  head: () => ({ meta: [{ title: "SDK Test — DB·GUARD" }] }),
  component: SdkTestPage,
});

function SdkTestPage() {
  const [slug, setSlug] = useState<string>(() => localStorage.getItem("sdk_test_slug") || "");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [config, setConfig] = useState<AnyObj | null>(null);
  const [me, setMe] = useState<AnyObj | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [collection, setCollection] = useState("hn_sdk_test");
  const [recordJson, setRecordJson] = useState('{"hello":"world"}');
  const [records, setRecords] = useState<AnyObj[]>([]);

  const [files, setFiles] = useState<AnyObj[]>([]);

  function pushLog(e: Omit<LogEntry, "ts">) {
    setLogs((prev) => [...prev.slice(-99), { ts: Date.now(), ...e }]);
    setTimeout(() => { logRef.current?.scrollTo({ top: 9e9 }); }, 0);
  }

  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    pushLog({ kind: "out", label, data: null });
    try {
      const r = await fn();
      pushLog({ kind: "in", label, data: r });
      return r;
    } catch (e) {
      pushLog({ kind: "err", label, data: String(e) });
      return null;
    }
  }

  function loadSdk() {
    if (!slug.trim()) return;
    localStorage.setItem("sdk_test_slug", slug.trim());
    setStatus("loading");
    setConfig(null); setMe(null); setLogs([]);
    // remove any previous script + reset window.HN
    document.querySelectorAll("script[data-hn-sdk]").forEach((el) => el.remove());
    try { delete (window as { HN?: unknown }).HN; } catch { window.HN = undefined; }

    const s = document.createElement("script");
    s.src = "/hn.js?ts=" + Date.now();
    s.setAttribute("data-site", slug.trim());
    s.setAttribute("data-base", window.location.origin);
    s.setAttribute("data-debug", "true");
    s.setAttribute("data-hn-sdk", "true");
    s.async = true;
    s.onload = async () => {
      setLoaded(true);
      pushLog({ kind: "in", label: "sdk.loaded", data: { version: window.HN?.version } });
      try {
        const cfg = await window.HN!.ready;
        setConfig((cfg as AnyObj) || null);
        setStatus(cfg ? "ready" : "error");
        const meRes = await window.HN!.auth.me();
        if (meRes && (meRes as AnyObj).ok) setMe((meRes as AnyObj).user as AnyObj);
      } catch (e) {
        setStatus("error");
        pushLog({ kind: "err", label: "sdk.ready", data: String(e) });
      }
    };
    s.onerror = () => { setStatus("error"); pushLog({ kind: "err", label: "sdk.load", data: "script_error" }); };
    document.body.appendChild(s);
  }

  useEffect(() => {
    // intercept hn.js console.log for log panel
    const orig = console.log;
    console.log = function (...args: unknown[]) {
      if (args[0] === "[HN]") pushLog({ kind: "in", label: "hn.log", data: args.slice(1) });
      orig.apply(console, args);
    };
    return () => { console.log = orig; };
  }, []);

  return (
    <DashboardShell title="SDK Test">
      <div className="max-w-6xl space-y-6">
        <Card title="1. Site connection">
          <div className="flex gap-2 items-end">
            <Field label="Site slug" className="flex-1">
              <input
                value={slug} onChange={(e) => setSlug(e.target.value)}
                placeholder="my-site"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
            <button onClick={loadSdk} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
              {loaded ? "Reload SDK" : "Load SDK"}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Stat label="Status" value={status} tone={status === "ready" ? "ok" : status === "error" ? "err" : "muted"} />
            <Stat label="SDK version" value={window.HN?.version || "—"} />
            <Stat label="Token" value={window.HN?.auth.token() ? "✓ present" : "—"} tone={window.HN?.auth.token() ? "ok" : "muted"} />
          </div>
          {config && (
            <pre className="mt-3 max-h-40 overflow-auto rounded bg-muted/40 p-3 text-[11px] font-mono">{JSON.stringify(config, null, 2)}</pre>
          )}
        </Card>

        <Card title="2. HN.auth">
          <div className="grid grid-cols-3 gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name (signup)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn onClick={async () => { const r = await run("auth.signup", () => window.HN!.auth.signup(email, password, name)); if (r && (r as AnyObj).ok) setMe((r as AnyObj).user as AnyObj); }}>signup</Btn>
            <Btn onClick={async () => { const r = await run("auth.login", () => window.HN!.auth.login(email, password)); if (r && (r as AnyObj).ok) setMe((r as AnyObj).user as AnyObj); }}>login</Btn>
            <Btn onClick={async () => { const r = await run("auth.me", () => window.HN!.auth.me()); if (r && (r as AnyObj).ok) setMe((r as AnyObj).user as AnyObj); }}>me</Btn>
            <Btn onClick={async () => { await run("auth.logout", () => window.HN!.auth.logout()); setMe(null); }}>logout</Btn>
            <Btn onClick={async () => { await run("permissions.list", () => window.HN!.permissions.list()); }}>permissions.list</Btn>
          </div>
          {me && <pre className="mt-3 rounded bg-muted/40 p-3 text-[11px] font-mono">{JSON.stringify(me, null, 2)}</pre>}
        </Card>

        <Card title="3. HN.db">
          <div className="flex gap-2">
            <input value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="collection" className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
            <input value={recordJson} onChange={(e) => setRecordJson(e.target.value)} placeholder='{"key":"value"}' className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn onClick={async () => {
              let data: AnyObj = {};
              try { data = JSON.parse(recordJson); } catch { pushLog({ kind: "err", label: "db.insert", data: "invalid_json" }); return; }
              const r = await run("db.insert", () => window.HN!.db.insert(collection, data));
              if (r && (r as AnyObj).ok) await refreshRecords();
            }}>insert</Btn>
            <Btn onClick={refreshRecords}>list</Btn>
          </div>
          {records.length > 0 && (
            <div className="mt-3 space-y-1">
              {records.map((r) => (
                <div key={String(r.id)} className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs font-mono">
                  <span className="text-muted-foreground">{String(r.id).slice(0, 8)}</span>
                  <span className="flex-1 truncate">{JSON.stringify(r.data)}</span>
                  <button onClick={async () => { await run("db.delete", () => window.HN!.db.delete(collection, String(r.id))); await refreshRecords(); }} className="text-destructive">delete</button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="4. HN.storage">
          <input
            type="file"
            onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const r = await run("storage.upload", () => window.HN!.storage.upload(f));
              if (r && (r as AnyObj).ok) await refreshFiles();
            }}
            className="text-sm"
          />
          <div className="mt-3 flex gap-2">
            <Btn onClick={refreshFiles}>list</Btn>
            <Btn onClick={() => window.HN!.analytics.track("sdk_test_event", { from: "dashboard" })}>analytics.track</Btn>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f) => (
                <div key={String(f.id)} className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs font-mono">
                  <span className="text-muted-foreground">{String(f.id).slice(0, 8)}</span>
                  <span className="flex-1 truncate">{String(f.file_name || f.name)}</span>
                  <a href={window.HN!.storage.url(String(f.id))} target="_blank" rel="noreferrer" className="text-primary">open</a>
                  <button onClick={async () => { await run("storage.delete", () => window.HN!.storage.delete(String(f.id))); await refreshFiles(); }} className="text-destructive">delete</button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="5. Logs">
          <div ref={logRef} className="h-72 overflow-auto rounded bg-black/80 p-3 font-mono text-[11px] text-green-300 space-y-0.5">
            {logs.length === 0 && <div className="text-muted-foreground">No activity yet.</div>}
            {logs.map((l, i) => (
              <div key={i} className={l.kind === "err" ? "text-red-400" : l.kind === "out" ? "text-blue-300" : "text-green-300"}>
                {new Date(l.ts).toISOString().slice(11, 19)} {l.kind === "out" ? "→" : l.kind === "err" ? "✗" : "←"} {l.label} {l.data !== null ? JSON.stringify(l.data) : ""}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );

  async function refreshRecords() {
    const r = await run("db.list", () => window.HN!.db.list(collection, { limit: 20 }));
    if (r && (r as AnyObj).ok) setRecords(((r as AnyObj).records as AnyObj[]) || []);
  }
  async function refreshFiles() {
    const r = await run("storage.list", () => window.HN!.storage.list({ limit: 20 }));
    if (r && (r as AnyObj).ok) setFiles((((r as AnyObj).files as AnyObj[]) || ((r as AnyObj).objects as AnyObj[])) || []);
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card/40 p-5">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={"block " + (className || "")}>
      <span className="text-xs text-muted-foreground block mb-1">{label}</span>
      {children}
    </label>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
      {children}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "err" | "muted" }) {
  const color = tone === "ok" ? "text-emerald-500" : tone === "err" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded border border-border px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={"font-mono text-sm " + color}>{value}</div>
    </div>
  );
}
