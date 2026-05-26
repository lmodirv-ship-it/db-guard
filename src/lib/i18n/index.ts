import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";
import fr from "@/locales/fr/common.json";
import es from "@/locales/es/common.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
export const DEFAULT_LANGUAGE: LanguageCode = "en";
export const RTL_LANGUAGES: LanguageCode[] = ["ar"];
const STORAGE_KEY = "dbguard-lang";
export const LANG_COOKIE = "dbguard-lang";

export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return !!code && SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

export function dirFor(lng: string): "rtl" | "ltr" {
  return RTL_LANGUAGES.includes(lng as LanguageCode) ? "rtl" : "ltr";
}

export function parseLangCookie(cookieHeader: string | null | undefined): LanguageCode {
  if (!cookieHeader) return DEFAULT_LANGUAGE;
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${LANG_COOKIE}=`));
  if (!match) return DEFAULT_LANGUAGE;
  const value = decodeURIComponent(match.slice(LANG_COOKIE.length + 1));
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

// Read SSR-injected language synchronously so client first render matches.
function initialClientLanguage(): LanguageCode {
  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement.lang;
    if (isSupportedLanguage(htmlLang)) return htmlLang;
    const fromCookie = readCookie(LANG_COOKIE);
    if (isSupportedLanguage(fromCookie)) return fromCookie;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isSupportedLanguage(stored)) return stored;
  }
  return DEFAULT_LANGUAGE;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { common: en },
      ar: { common: ar },
      fr: { common: fr },
      es: { common: es },
    },
    lng: initialClientLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export function getStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const fromCookie = readCookie(LANG_COOKIE);
  if (isSupportedLanguage(fromCookie)) return fromCookie;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isSupportedLanguage(stored)) return stored;
  return DEFAULT_LANGUAGE;
}

export function setStoredLanguage(lng: LanguageCode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, lng);
  // 1-year cookie so SSR can read the preferred language on next request
  document.cookie = `${LANG_COOKIE}=${encodeURIComponent(lng)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function applyDocumentLanguage(lng: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng;
  document.documentElement.dir = dirFor(lng);
}

i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;

