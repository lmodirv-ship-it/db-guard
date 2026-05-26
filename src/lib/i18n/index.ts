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

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { common: en },
      ar: { common: ar },
      fr: { common: fr },
      es: { common: es },
    },
    lng: DEFAULT_LANGUAGE,
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
  const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored;
  return DEFAULT_LANGUAGE;
}

export function setStoredLanguage(lng: LanguageCode) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, lng);
}

export function applyDocumentLanguage(lng: string) {
  if (typeof document === "undefined") return;
  const dir = RTL_LANGUAGES.includes(lng as LanguageCode) ? "rtl" : "ltr";
  document.documentElement.lang = lng;
  document.documentElement.dir = dir;
}

i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
