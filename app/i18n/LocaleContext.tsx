import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Locale, type Translations } from "./translations";

const LocaleContext = createContext<{
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
} | null>(null);

const STORAGE_KEY = "gwp_locale";

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "ko" || saved === "en") {
        setLocaleState(saved);
      }
    } catch {
      // localStorage unavailable — fall back to the server-detected locale.
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslations() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useTranslations must be used within a LocaleProvider");
  }
  return ctx;
}
