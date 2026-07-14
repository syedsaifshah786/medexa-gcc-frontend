import type { GCCLocale } from "@/i18n/types";

export const GCC_LOCALE_TAGS: Record<GCCLocale, string> = {
  en: "en-US",
  ar: "ar-SA-u-ca-gregory-nu-arab",
};

function toDate(value: Date | string | number) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

export function formatNumber(
  value: number | bigint,
  locale: GCCLocale,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(GCC_LOCALE_TAGS[locale], options).format(value);
}

export function formatPercent(
  value: number,
  locale: GCCLocale,
  options?: Intl.NumberFormatOptions,
) {
  const normalizedValue = Math.abs(value) > 1 ? value / 100 : value;

  return new Intl.NumberFormat(GCC_LOCALE_TAGS[locale], {
    style: "percent",
    maximumFractionDigits: 0,
    ...options,
  }).format(normalizedValue);
}

export function formatDate(
  value: Date | string | number,
  locale: GCCLocale,
  options?: Intl.DateTimeFormatOptions,
) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(GCC_LOCALE_TAGS[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    calendar: "gregory",
    ...options,
  }).format(date);
}

export function formatTime(
  value: Date | string | number,
  locale: GCCLocale,
  options?: Intl.DateTimeFormatOptions,
) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(GCC_LOCALE_TAGS[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  }).format(date);
}

export function localizeDigits(value: string, locale: GCCLocale) {
  if (locale === "en") {
    return value;
  }

  const digitFormatter = new Intl.NumberFormat(GCC_LOCALE_TAGS.ar, {
    useGrouping: false,
  });

  return value.replace(/\d/g, (digit) => digitFormatter.format(Number(digit)));
}

export function formatDuration(elapsedMs: number, locale: GCCLocale) {
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const totalSeconds = Math.floor(safeElapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const westernValue = hours > 0
    ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return localizeDigits(westernValue, locale);
}

export function formatSessionProgress(current: number, total: number, locale: GCCLocale) {
  return `${formatNumber(current, locale, { minimumIntegerDigits: 2 })} / ${formatNumber(total, locale, { minimumIntegerDigits: 2 })}`;
}
