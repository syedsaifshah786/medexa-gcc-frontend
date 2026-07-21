import { describe, expect, it } from "vitest";
import { mapLiveInsightsResponse } from "@/lib/api/map-live-insights-response";
import { activeLiveSuggestions, upsertLiveSuggestions } from "@/lib/live-insights/upsert-live-suggestions";

function mapped(message: string) {
  return mapLiveInsightsResponse({
    session_id: "session-1",
    transcript_revision: 1,
    suggestions: [{ category: "clinical", title: "Clinical Insight", message }],
  }).suggestions[0];
}

describe("upsertLiveSuggestions", () => {
  it("updates the canonical active suggestions used by the UI", () => {
    const next = upsertLiveSuggestions([], [mapped("Clarify symptom duration.")]);
    expect(activeLiveSuggestions(next)).toHaveLength(1);
  });

  it("deduplicates by full fingerprint without collapsing distinct messages", () => {
    const first = mapped("Clarify symptom duration.");
    const second = mapped("Clarify pain severity.");
    const next = upsertLiveSuggestions([first], [first, second]);
    expect(next).toHaveLength(2);
  });

  it("does not reintroduce approved or ignored suggestions", () => {
    const item = mapped("Clarify symptom duration.");
    expect(upsertLiveSuggestions([], [item], new Set([item.fingerprint]))).toEqual([]);
    expect(upsertLiveSuggestions([], [item], new Set(), new Set([item.id]))).toEqual([]);
  });

  it("preserves existing cards when a rate-limit response contains no items", () => {
    const existing = mapped("Clarify symptom duration.");
    expect(upsertLiveSuggestions([existing], [])).toEqual([existing]);
  });
});
