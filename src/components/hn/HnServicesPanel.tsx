import shieldGlobe from "@/assets/hn-shield-globe.png";

const services = [
  { name: "HN Chat", color: "#f5b800", icon: "💬" },
  { name: "HN Driver", color: "#3ba8e0", icon: "🚗" },
  { name: "HN Souk", color: "#e84393", icon: "🛒" },
  { name: "HN Studio", color: "#c44ae8", icon: "📷" },
  { name: "HN Video AI", color: "#e85d3a", icon: "▶" },
  { name: "DB Guard", color: "#2dd4a8", icon: "🛡" },
];

const features = [
  { label: "حساب آمن", icon: "🛡" },
  { label: "دخول فوري\nلكل المواقع", icon: "⚡" },
  { label: "إشعارات\nمهمة", icon: "🔔" },
  { label: "دعم موحد\n24/7", icon: "🎧" },
];

export function HnServicesPanel() {
  return (
    <div className="hidden lg:flex flex-col items-center text-center px-6 py-8">
      {/* Logo + headline */}
      <div className="mb-2">
        <div className="text-3xl font-black leading-none mb-1" style={{ color: "var(--hn-text-muted)", fontFamily: "Outfit, sans-serif" }}>1</div>
        <div className="hn-text-gold text-6xl font-black tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>HN</div>
      </div>
      <h1 className="text-4xl font-black leading-tight mb-2" style={{ color: "var(--hn-text)" }}>
        مرحبًا بك في
        <br />
        مجموعة <span className="hn-text-gold">HN</span>
      </h1>
      <p className="text-sm mt-2 mb-4" style={{ color: "var(--hn-text-muted)" }}>
        حساب واحد لجميع خدمات HN
      </p>
      <div className="hn-divider-gold mb-6" />

      {/* Center: shield+globe with floating service icons */}
      <div className="relative w-[420px] h-[380px] flex items-center justify-center">
        <img
          src={shieldGlobe}
          alt="HN Shield"
          className="absolute inset-0 m-auto w-[340px] h-[340px] object-contain hn-float"
          width={340}
          height={340}
        />
        {/* Floating service badges around */}
        <div className="absolute top-4 left-2 hn-service-tile w-20">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
               style={{ background: "rgba(245,184,0,.15)", border: "1px solid rgba(245,184,0,.3)" }}>💬</div>
          <span className="text-xs font-bold" style={{ color: "var(--hn-text)" }}>HN Chat</span>
        </div>
        <div className="absolute top-4 right-2 hn-service-tile w-20">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
               style={{ background: "rgba(59,168,224,.15)", border: "1px solid rgba(59,168,224,.4)" }}>🚗</div>
          <span className="text-xs font-bold" style={{ color: "var(--hn-text)" }}>HN Driver</span>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 left-0 hn-service-tile w-20">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
               style={{ background: "rgba(232,67,147,.15)", border: "1px solid rgba(232,67,147,.4)" }}>🛒</div>
          <span className="text-xs font-bold" style={{ color: "var(--hn-text)" }}>HN Souk</span>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-0 hn-service-tile w-20">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
               style={{ background: "rgba(196,74,232,.15)", border: "1px solid rgba(196,74,232,.4)" }}>📷</div>
          <span className="text-xs font-bold" style={{ color: "var(--hn-text)" }}>HN Studio</span>
        </div>
        <div className="absolute bottom-2 left-6 hn-service-tile w-20">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
               style={{ background: "rgba(232,93,58,.15)", border: "1px solid rgba(232,93,58,.4)" }}>▶</div>
          <span className="text-xs font-bold" style={{ color: "var(--hn-text)" }}>HN Video AI</span>
        </div>
        <div className="absolute bottom-2 right-6 hn-service-tile w-20">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
               style={{ background: "rgba(45,212,168,.15)", border: "1px solid rgba(45,212,168,.4)" }}>🛡</div>
          <span className="text-xs font-bold" style={{ color: "var(--hn-text)" }}>DB Guard</span>
        </div>
      </div>

      {/* Features row */}
      <div className="grid grid-cols-4 gap-3 mt-8 w-full max-w-md">
        {features.map((f) => (
          <div key={f.label} className="hn-service-tile">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                 style={{ background: "rgba(245,184,0,.12)", border: "1px solid rgba(245,184,0,.3)" }}>
              {f.icon}
            </div>
            <span className="text-[11px] font-semibold whitespace-pre-line leading-tight"
                  style={{ color: "var(--hn-text)" }}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HnServicesFooter() {
  return (
    <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--hn-border)" }}>
      <p className="text-center text-sm mb-4" style={{ color: "var(--hn-text-muted)" }}>
        يمكنك استعمال هذا الحساب في جميع خدمات HN
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {services.map((s) => (
          <div key={s.name} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                 style={{ background: `${s.color}20`, border: `1px solid ${s.color}55` }}>
              {s.icon}
            </div>
            <span className="text-[11px] font-semibold" style={{ color: "var(--hn-text)" }}>{s.name}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs mt-5 flex items-center justify-center gap-2"
         style={{ color: "var(--hn-text-muted)" }}>
        <span>🛡</span>
        حسابك محمي بأفضل تقنيات الأمان والخصوصية
      </p>
      <p className="text-center text-xs mt-3 flex items-center justify-center gap-2 flex-wrap"
         style={{ color: "var(--hn-text-muted)" }}>
        <span>✉️</span>
        <span>للتواصل:</span>
        <a href="mailto:admin@hn-db.fun" className="hn-text-gold font-bold hover:underline" style={{ fontFamily: "Outfit, sans-serif" }}>
          admin@hn-db.fun
        </a>
      </p>
    </div>
  );
}
