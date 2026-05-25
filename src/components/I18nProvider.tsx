import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n, { applyDocumentLanguage, getStoredLanguage, DEFAULT_LANGUAGE } from "@/lib/i18n";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));

  // Hydration-safe i18n: first client render matches SSR (DEFAULT_LANGUAGE).
  // After hydration, switch to the stored language.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const stored = getStoredLanguage();
    if (stored !== i18n.language) {
      i18n.changeLanguage(stored);
    } else {
      applyDocumentLanguage(stored);
    }
  }, []);

  void DEFAULT_LANGUAGE;
  void hydrated;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
