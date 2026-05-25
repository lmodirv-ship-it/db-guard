import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import i18n, { applyDocumentLanguage } from "@/lib/i18n";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyDocumentLanguage(i18n.language);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
