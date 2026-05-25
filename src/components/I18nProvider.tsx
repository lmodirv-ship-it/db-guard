import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import i18n, { applyDocumentLanguage, getStoredLanguage, DEFAULT_LANGUAGE } from "@/lib/i18n";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored !== i18n.language) {
      i18n.changeLanguage(stored);
    } else {
      applyDocumentLanguage(stored);
    }
    setHydrated(true);
  }, []);

  // Until client hydrates, force default language to match SSR output
  void hydrated;
  void DEFAULT_LANGUAGE;

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
