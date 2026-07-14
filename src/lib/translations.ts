import { getDirection, translate, translations } from "@/i18n";
import type { GCCLocale } from "@/i18n/types";
import {
  formatDate,
  formatDuration as formatElapsedDuration,
  formatNumber as formatLocalizedNumber,
  localizeDigits,
} from "@/lib/i18n/formatters";

export { getDirection, translate, translations };
export type {
  GCCLocale,
  GCCLocaleContextValue,
  TranslationKey,
  TranslationParams,
} from "@/i18n/types";

export type Language = GCCLocale;

export function isRTL(locale: GCCLocale) {
  return locale === "ar";
}

export function getCurrentLanguage(): GCCLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const stored = window.localStorage.getItem("medexa_gcc_locale");
    if (stored === "en" || stored === "ar") {
      return stored;
    }
    return window.localStorage.getItem("medexa-language") === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

export function formatNumber(value: number | string, locale: GCCLocale) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed)
    ? formatLocalizedNumber(parsed, locale)
    : localizeDigits(String(value), locale);
}

export function formatClockTime(totalSeconds: number, locale: GCCLocale) {
  return formatElapsedDuration(totalSeconds * 1000, locale);
}

export const formatDuration = formatClockTime;

export function formatDurationLabel(totalSeconds: number, locale: GCCLocale) {
  return formatClockTime(totalSeconds, locale);
}

export function formatUnits(count: number, locale: GCCLocale) {
  return `${formatNumber(count, locale)} ${translate(locale, count === 1 ? "unit.one" : "unit.other")}`;
}

export function formatDateTime(value: string | Date, locale: GCCLocale) {
  return formatDate(value, locale, {
    month: "long",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCurrency(value: number, locale: GCCLocale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-arab" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function translateStatus(status: string | null | undefined, locale: GCCLocale) {
  if (!status) return "";
  const key = `status.${status.trim().toLowerCase().replace(/[\s_-]+/g, "")}`;
  const localized = translate(locale, key);
  return localized === key ? status : localized;
}

export function translateDynamicMessage(message: string | null | undefined) {
  return message ?? "";
}

export function translateCptDisplayName(
  code: string | null | undefined,
  fallbackName: string | null | undefined,
) {
  return fallbackName ?? code ?? "";
}

export const translateCptLabel = translateCptDisplayName;
