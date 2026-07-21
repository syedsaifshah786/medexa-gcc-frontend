import type { GCCLocale } from "@/i18n/types";

export function normalizeReviewLocale(locale: string): GCCLocale {
  return locale.toLocaleLowerCase().startsWith("ar") ? "ar" : "en";
}

export function getReviewCacheKey(sessionId: string, locale: string) {
  return `medexa_gcc_review_bundle_${sessionId}_${normalizeReviewLocale(locale)}`;
}

export function getCompatibleReviewCacheKeys(sessionId: string, locale: string) {
  const normalized = normalizeReviewLocale(locale);
  const regional = normalized === "ar" ? "ar-SA" : "en-US";
  return [
    getReviewCacheKey(sessionId, normalized),
    `medexa_gcc_review_bundle_${sessionId}_${regional}`,
    `medexa_gcc_review_bundle_${sessionId}`,
  ];
}
