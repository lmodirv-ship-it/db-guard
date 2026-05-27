import { HnServicesPanel, HnServicesFooter } from "./HnServicesPanel";

export function HnAuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hn-theme min-h-screen w-full hn-bg relative overflow-hidden" dir="rtl">
      <div className="pointer-events-none absolute inset-0 hn-grid" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[calc(100vh-6rem)]">
          {/* Left: branding (hidden on mobile) */}
          <HnServicesPanel />

          {/* Right: form card */}
          <div className="flex flex-col items-center w-full">
            {/* mobile logo */}
            <div className="lg:hidden mb-6 text-center">
              <div className="text-2xl font-black leading-none mb-1" style={{ color: "var(--hn-text-muted)", fontFamily: "Outfit, sans-serif" }}>1</div>
              <div className="hn-text-gold text-5xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>HN</div>
              <p className="text-xs mt-1" style={{ color: "var(--hn-text-muted)" }}>حساب موحّد لجميع خدمات HN</p>
            </div>
            <div className="hn-card w-full max-w-md p-7 sm:p-9">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-black mb-2" style={{ color: "var(--hn-text)" }}>
                  {title}
                </h2>
                <p className="text-sm" style={{ color: "var(--hn-text-muted)" }}>{subtitle}</p>
                <div className="flex justify-center mt-3"><div className="hn-divider-gold" /></div>
              </div>
              {children}
            </div>
            <div className="w-full max-w-md">
              <HnServicesFooter />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HnField({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none"
           style={{ color: "var(--hn-gold)" }}>
        {icon}
      </div>
    </div>
  );
}
