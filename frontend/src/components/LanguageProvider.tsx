"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AMHARIC_UI_ENABLED } from "@/lib/featureFlags";
import {
  getStoredLanguage,
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  translate,
  type AppLanguage,
  type TranslationKey,
} from "@/lib/i18n";
import { hasAuthSession, updatePreferredLanguage } from "@/lib/api";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLanguageState(getStoredLanguage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language === "am" ? "am" : "en";
  }, [language, ready]);

  const setLanguage = useCallback((lang: AppLanguage) => {
    const next = !AMHARIC_UI_ENABLED ? "en" : lang;
    setLanguageState(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    if (typeof window !== "undefined" && hasAuthSession()) {
      updatePreferredLanguage(next).catch(() => {});
    }
  }, []);

  const t = useCallback((key: TranslationKey) => translate(language, key), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

export function useLanguageOptional() {
  return useContext(LanguageContext);
}

export function syncLanguageFromProfile(preferred: string | null | undefined) {
  if (!AMHARIC_UI_ENABLED) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    if (typeof document !== "undefined") {
      document.documentElement.lang = "en";
    }
    return;
  }
  if (isAppLanguage(preferred)) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, preferred);
    if (typeof document !== "undefined") {
      document.documentElement.lang = preferred === "am" ? "am" : "en";
    }
  }
}
