import { ar } from "./ar";
import { en } from "./en";
import type {
  GCCDirection,
  GCCLocale,
  TranslationDictionary,
  TranslationKey,
  TranslationParams,
} from "./types";

const arabicDictionaryWithEnglishParity: Record<keyof typeof en, string> = ar;

export const translations: Record<GCCLocale, TranslationDictionary> = {
  en,
  ar: arabicDictionaryWithEnglishParity,
};

export function getDirection(locale: GCCLocale): GCCDirection {
  return locale === "ar" ? "rtl" : "ltr";
}

export function translate(
  locale: GCCLocale,
  key: TranslationKey,
  params: TranslationParams = {},
) {
  const template = translations[locale][key] ?? translations.en[key] ?? key;

  if (process.env.NODE_ENV === "development" && template === key && !translations.en[key]) {
    console.warn(`Missing translation key: ${key}`);
  }

  return template.replace(/\{(\w+)\}/g, (_, paramKey: string) => {
    const value = params[paramKey];
    return value === null || value === undefined ? "" : String(value);
  });
}

export type {
  GCCDirection,
  GCCLocale,
  GCCLocaleContextValue,
  TranslationDictionary,
  TranslationKey,
  TranslationParams,
} from "./types";

export { ar, en };
