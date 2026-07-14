"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useEffect,
} from "react";
import { translate } from "@/i18n";
import type { GCCLocale, GCCLocaleContextValue } from "@/i18n/types";
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  formatSessionProgress,
  formatTime,
} from "@/lib/i18n/formatters";

export const GCC_LOCALE_STORAGE_KEY = "medexa_gcc_locale";
const LEGACY_LOCALE_STORAGE_KEY = "medexa-language";

const GCCLocaleContext = createContext<GCCLocaleContextValue | null>(null);

function isGCCLocale(value: string | null): value is GCCLocale {
  return value === "en" || value === "ar";
}

function readStoredLocale(): GCCLocale {
  try {
    const storedLocale = window.localStorage.getItem(GCC_LOCALE_STORAGE_KEY);
    if (isGCCLocale(storedLocale)) {
      return storedLocale;
    }

    const legacyLocale = window.localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
    return isGCCLocale(legacyLocale) ? legacyLocale : "en";
  } catch {
    return "en";
  }
}

function applyDocumentLocale(locale: GCCLocale) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
  root.dataset.gccLocale = locale;
  root.dataset.gccLocaleReady = "true";
  document.title = translate(locale, "meta.title");
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  description?.setAttribute("content", translate(locale, "meta.description"));
}

export function GCCLocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: GCCLocale;
}) {
  const [locale, setLocaleState] = useState<GCCLocale>(initialLocale);

  useLayoutEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== GCC_LOCALE_STORAGE_KEY && event.key !== LEGACY_LOCALE_STORAGE_KEY) return;
      const nextLocale = readStoredLocale();
      setLocaleState(nextLocale);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setLocale = useCallback((nextLocale: GCCLocale) => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(GCC_LOCALE_STORAGE_KEY, nextLocale);
      window.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
    } catch {
      // The in-memory locale still changes when storage is unavailable.
    }
    document.cookie = `${GCC_LOCALE_STORAGE_KEY}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    applyDocumentLocale(nextLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ar" : "en");
  }, [locale, setLocale]);

  const value = useMemo<GCCLocaleContextValue>(
    () => ({
      locale,
      direction: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      toggleLocale,
      t: (key, params) => translate(locale, key, params),
      formatNumber: (number) => formatNumber(number, locale),
      formatPercent: (number) => formatPercent(number, locale),
      formatDate: (date, options) => formatDate(date, locale, options),
      formatTime: (date, options) => formatTime(date, locale, options),
      formatDuration: (elapsedMs) => formatDuration(elapsedMs, locale),
      formatSessionProgress: (current, total) => formatSessionProgress(current, total, locale),
    }),
    [locale, setLocale, toggleLocale],
  );

  return <GCCLocaleContext.Provider value={value}>{children}</GCCLocaleContext.Provider>;
}

export function useGCCLocaleContext() {
  const context = useContext(GCCLocaleContext);
  if (!context) {
    throw new Error("useGCCLocale must be used within GCCLocaleProvider");
  }

  return context;
}
