import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cacheReviewBundleBeforeNavigation, readReviewBundleFromCache } from "@/lib/gcc/session-api";
import { countMeaningfulSoapFields, mapReviewBundleResponse } from "@/lib/review/map-review-bundle-response";
import { resolveReviewBundleForSession } from "@/lib/review/resolve-review-bundle";
import { rawFinalizeResponse } from "@/lib/review/review-test-fixture";

vi.mock("@/hooks/useGCCLocale", () => ({
  useGCCLocale: () => ({
    formatNumber: (value: number) => String(value),
    t: (key: string) => ({
      "review.soap.objective": "Objective",
      "review.soap.assessment": "Assessment",
      "review.soap.plan": "Plan",
    }[key] ?? key),
  }),
}));

vi.mock("@/components/review/GCCReviewCardFrame", () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => <article><h2>{title}</h2>{children}</article>,
}));

afterEach(() => vi.unstubAllGlobals());

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  } satisfies Storage;
}

function countRawSoapFields(raw: unknown) {
  const response = raw as { review_bundle?: { soap_note?: Record<string, Record<string, unknown>> } };
  const soap = response.review_bundle?.soap_note;
  if (!soap) return 0;
  return ["subjective", "objective", "assessment", "plan"].reduce((count, sectionName) => {
    const section = soap[sectionName] ?? {};
    return count + Object.entries(section).reduce((sectionCount, [key, value]) => {
      if (key === "source_evidence") return sectionCount;
      if (typeof value === "string" && value.trim()) return sectionCount + 1;
      if (Array.isArray(value)) return sectionCount + value.filter((item) => typeof item === "string" && item.trim()).length;
      return sectionCount;
    }, 0);
  }, 0);
}

describe("GCCSoapReviewCard", () => {
  it("renders real Subjective, Assessment, and Plan values from a mapped response", async () => {
    const { default: GCCSoapReviewCard } = await import("@/components/review/GCCSoapReviewCard");
    const soapNote = mapReviewBundleResponse(rawFinalizeResponse).reviewBundle.soapNote;
    const html = renderToStaticMarkup(<GCCSoapReviewCard soapNote={soapNote} isLoading={false} errorMessage={null} onRetry={() => undefined} />);

    expect(html).toContain("Lower back pain");
    expect(html).toContain("Assessment");
    expect(html).toContain("Walking is limited.");
    expect(html).toContain("Plan");
    expect(html).toContain("Next week");
    expect(html).not.toContain("review.emptyTitle");
  });

  it.runIf(Boolean(process.env.REVIEW_TRACE_RESPONSE_PATH))(
    "traces a production review through mapping, cache, loading, and SOAP rendering",
    async () => {
      vi.stubGlobal("window", {});
      vi.stubGlobal("localStorage", memoryStorage());
      const raw = JSON.parse(readFileSync(process.env.REVIEW_TRACE_RESPONSE_PATH!, "utf8"));
      const mapped = mapReviewBundleResponse(raw);
      let providerBundle = null as typeof mapped.reviewBundle | null;
      expect(cacheReviewBundleBeforeNavigation(mapped.reviewBundle, "en", (bundle) => { providerBundle = bundle; })).toBe(true);
      const cached = readReviewBundleFromCache(mapped.sessionId, "en");
      const loaded = resolveReviewBundleForSession(mapped.sessionId, "en", providerBundle, cached);
      const { default: GCCSoapReviewCard } = await import("@/components/review/GCCSoapReviewCard");
      const html = renderToStaticMarkup(<GCCSoapReviewCard soapNote={loaded.bundle!.soapNote} isLoading={false} errorMessage={null} onRetry={() => undefined} />);
      const renderedCount = Number(html.match(/data-soap-rendered-field-count="(\d+)"/)?.[1] ?? 0);
      const counts = {
        backendSoapFieldCount: countRawSoapFields(raw),
        frontendMappedSoapFieldCount: countMeaningfulSoapFields(mapped.reviewBundle.soapNote),
        cachedSoapFieldCount: cached ? countMeaningfulSoapFields(cached.soapNote) : 0,
        soapLoadedFieldCount: loaded.bundle ? countMeaningfulSoapFields(loaded.bundle.soapNote) : 0,
        soapRenderedFieldCount: renderedCount,
      };
      console.info("[GCC review] production pipeline trace", counts);
      expect(loaded.source).toBe("provider");
      expect(new Set(Object.values(counts)).size).toBe(1);
      expect(renderedCount).toBeGreaterThan(0);
    },
  );
});
