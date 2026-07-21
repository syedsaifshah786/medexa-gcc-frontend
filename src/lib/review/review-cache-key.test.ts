import { afterEach, describe, expect, it, vi } from "vitest";
import { cacheReviewBundleBeforeNavigation, readReviewBundleFromCache } from "@/lib/gcc/session-api";
import { getCompatibleReviewCacheKeys, getReviewCacheKey } from "@/lib/review/review-cache-key";
import { mapReviewBundleResponse } from "@/lib/review/map-review-bundle-response";
import { resolveReviewBundleForSession } from "@/lib/review/resolve-review-bundle";
import { rawFinalizeResponse } from "@/lib/review/review-test-fixture";

function memoryStorage(onWrite?: () => void) {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); onWrite?.(); },
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  } satisfies Storage;
}

afterEach(() => vi.unstubAllGlobals());

describe("review cache", () => {
  it("normalizes locale formats into one canonical key and lists legacy fallbacks", () => {
    expect(getReviewCacheKey("abc", "en-US")).toBe("medexa_gcc_review_bundle_abc_en");
    expect(getReviewCacheKey("abc", "ar-SA")).toBe("medexa_gcc_review_bundle_abc_ar");
    expect(getCompatibleReviewCacheKeys("abc", "en")).toContain("medexa_gcc_review_bundle_abc_en-US");
  });

  it("writes cache before updating shared provider state", () => {
    const operations: string[] = [];
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", memoryStorage(() => operations.push("cache")));
    const bundle = mapReviewBundleResponse(rawFinalizeResponse).reviewBundle;

    expect(cacheReviewBundleBeforeNavigation(bundle, "en", () => operations.push("provider"))).toBe(true);
    expect(operations).toEqual(["cache", "provider"]);
  });

  it("loads and migrates a compatible regional legacy key", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage);
    const bundle = mapReviewBundleResponse(rawFinalizeResponse).reviewBundle;
    storage.setItem("medexa_gcc_review_bundle_session-review-1_en-US", JSON.stringify(bundle));

    const loaded = readReviewBundleFromCache("session-review-1", "en");
    expect(loaded?.soapNote.subjective.chiefComplaint).toBe("Lower back pain");
    expect(storage.getItem("medexa_gcc_review_bundle_session-review-1_en")).not.toBeNull();
  });

  it("prefers the shared provider bundle over cache", () => {
    const provider = mapReviewBundleResponse(rawFinalizeResponse).reviewBundle;
    const cached = { ...provider, generatedAt: "older" };
    const resolved = resolveReviewBundleForSession("session-review-1", "en", provider, cached);
    expect(resolved.source).toBe("provider");
    expect(resolved.bundle).toBe(provider);
  });
});
