import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n, { applyDocumentLanguage, getStoredLanguage } from "@/lib/i18n";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));

  // i18n is initialized with the SSR-injected language (read from <html lang>
  // or cookie). Re-sync on mount only if storage diverges (e.g. user changed
  // language in another tab) — keeps first render identical to SSR.
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored !== i18n.language) {
      i18n.changeLanguage(stored);
    } else {
      applyDocumentLanguage(stored);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
