"use client";

import { GCCLocaleProvider } from "@/providers/GCCLocaleProvider";
import { useGCCLocale } from "@/hooks/useGCCLocale";

export const LanguageProvider = GCCLocaleProvider;

export function useLanguage() {
  const locale = useGCCLocale();

  return {
    language: locale.locale,
    setLanguage: locale.setLocale,
    t: locale.t,
    direction: locale.direction,
  };
}
