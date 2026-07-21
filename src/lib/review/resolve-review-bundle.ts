import type { GCCLocale } from "@/i18n/types";
import type { GCCReviewBundle } from "@/types/gcc-review";

export function resolveReviewBundleForSession(
  sessionId: string,
  locale: GCCLocale,
  providerBundle: GCCReviewBundle | null,
  cachedBundle: GCCReviewBundle | null,
) {
  if (providerBundle?.sessionId === sessionId && providerBundle.locale === locale) {
    return { bundle: providerBundle, source: "provider" as const };
  }
  if (cachedBundle?.sessionId === sessionId && cachedBundle.locale === locale) {
    return { bundle: cachedBundle, source: "cache" as const };
  }
  return { bundle: null, source: null };
}
