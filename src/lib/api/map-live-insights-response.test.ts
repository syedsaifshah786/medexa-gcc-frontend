import { describe, expect, it } from "vitest";
import { mapLiveInsightsResponse } from "@/lib/api/map-live-insights-response";

const envelope = (suggestions: unknown[], overrides: Record<string, unknown> = {}) => ({
  session_id: "session-1",
  transcript_revision: 3,
  suggestions,
  claim_readiness: null,
  provider: "groq",
  model: "llama-3.1-8b-instant",
  fallback_reason: null,
  retry_after_seconds: null,
  ...overrides,
});

describe("mapLiveInsightsResponse", () => {
  it("maps snake_case and keeps suggestions when claim readiness is null", () => {
    const mapped = mapLiveInsightsResponse(envelope([{
      category: "documentation",
      title: "Document symptom duration",
      message: "Confirm how long the symptom has been present.",
      action_label: "Requires clinician review",
      created_at: "2026-07-21T00:00:00Z",
    }]));

    expect(mapped.sessionId).toBe("session-1");
    expect(mapped.transcriptRevision).toBe(3);
    expect(mapped.claimReadiness).toBeNull();
    expect(mapped.suggestions).toHaveLength(1);
    expect(mapped.suggestions[0]).toMatchObject({
      confidence: null,
      evidence: null,
      actionLabel: "Requires clinician review",
      status: "active",
    });
  });

  it("supports legacy containers and text aliases", () => {
    const mapped = mapLiveInsightsResponse({
      session_id: "session-1",
      transcript_revision: 4,
      data: {
        suggestions: [{ heading: "Follow up", description: "Clarify pain severity." }],
      },
    });

    expect(mapped.suggestions[0]).toMatchObject({
      title: "Follow up",
      message: "Clarify pain severity.",
      category: "clinical",
      priority: "medium",
    });
  });

  it("normalizes unknown categories and 0-100 confidence", () => {
    const mapped = mapLiveInsightsResponse(envelope([{
      category: "new_clinical_kind",
      message: "Clarify walking limitations.",
      confidence: 85,
    }]));

    expect(mapped.suggestions[0].category).toBe("clinical");
    expect(mapped.suggestions[0].confidence).toBe(0.85);
  });

  it("drops only items without usable message text", () => {
    const mapped = mapLiveInsightsResponse(envelope([
      { title: "Incomplete" },
      { content: "Document the reported duration." },
    ]));

    expect(mapped.suggestions).toHaveLength(1);
    expect(mapped.suggestions[0].message).toBe("Document the reported duration.");
  });

  it("generates distinct stable fingerprints from full suggestion content", () => {
    const mapped = mapLiveInsightsResponse(envelope([
      { category: "clinical", title: "Clarify", message: "Clarify pain severity." },
      { category: "clinical", title: "Clarify", message: "Clarify symptom duration." },
    ]));

    expect(mapped.suggestions).toHaveLength(2);
    expect(mapped.suggestions[0].fingerprint).not.toBe(mapped.suggestions[1].fingerprint);
  });
});
