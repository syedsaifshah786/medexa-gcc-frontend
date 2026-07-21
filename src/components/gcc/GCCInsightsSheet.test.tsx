import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRawLiveSuggestionCount, mapLiveInsightsResponse } from "@/lib/api/map-live-insights-response";
import { activeLiveSuggestions, upsertLiveSuggestions } from "@/lib/live-insights/upsert-live-suggestions";

vi.mock("@/hooks/useGCCLocale", () => ({
  useGCCLocale: () => ({
    t: (key: string, values?: Record<string, string>) => {
      if (key === "session.insights.status.retrying") return "Live insights will retry shortly";
      if (key === "session.suggestion.evidenceQuote") return values?.evidence ?? "";
      return key;
    },
    formatNumber: (value: number) => String(value),
  }),
}));

vi.mock("@/components/gcc/SlideAction", () => ({
  default: ({ label }: { label: string }) => React.createElement("button", null, label),
}));

describe("GCCInsightsSheet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders mapped active suggestion cards", async () => {
    const { default: GCCInsightsSheet } = await import("@/components/gcc/GCCInsightsSheet");
    const response = mapLiveInsightsResponse({
      session_id: "session-1",
      transcript_revision: 1,
      suggestions: [{
        category: "documentation",
        title: "Document symptom duration",
        message: "Confirm how long the symptom has been present.",
        evidence: null,
      }],
      claim_readiness: null,
    });
    const html = renderToStaticMarkup(
      <GCCInsightsSheet
        activeSuggestions={response.suggestions}
        status="updated"
        lastUpdatedAt={Date.now()}
        hasTranscript
        onApprove={() => undefined}
        onIgnore={() => undefined}
      />,
    );

    expect(html).toContain("Document symptom duration");
    expect(html).toContain("Confirm how long the symptom has been present.");
  });

  it("keeps cards visible while showing the rate-limit retry state", async () => {
    const { default: GCCInsightsSheet } = await import("@/components/gcc/GCCInsightsSheet");
    const suggestion = mapLiveInsightsResponse({
      session_id: "session-1",
      transcript_revision: 1,
      suggestions: [{ message: "Clarify walking limitations." }],
    }).suggestions;
    const html = renderToStaticMarkup(
      <GCCInsightsSheet
        activeSuggestions={suggestion}
        status="retrying"
        lastUpdatedAt={Date.now()}
        hasTranscript
        onApprove={() => undefined}
        onIgnore={() => undefined}
      />,
    );

    expect(html).toContain("Clarify walking limitations.");
    expect(html).toContain("Live insights will retry shortly");
  });

  it.runIf(Boolean(process.env.LIVE_INSIGHTS_TRACE_RESPONSE_PATH))(
    "traces a production response through mapping, React state, and rendered cards",
    async () => {
      const raw = JSON.parse(readFileSync(process.env.LIVE_INSIGHTS_TRACE_RESPONSE_PATH!, "utf8"));
      const mapped = mapLiveInsightsResponse(raw);
      const state = upsertLiveSuggestions([], mapped.suggestions);
      const activeSuggestions = activeLiveSuggestions(state);
      const { default: GCCInsightsSheet } = await import("@/components/gcc/GCCInsightsSheet");
      const html = renderToStaticMarkup(
        <GCCInsightsSheet
          activeSuggestions={activeSuggestions}
          status="updated"
          lastUpdatedAt={Date.now()}
          hasTranscript
          onApprove={() => undefined}
          onIgnore={() => undefined}
        />,
      );
      const renderedSuggestionCount = (html.match(/data-live-suggestion-card=/g) ?? []).length;
      const counts = {
        backendOutputSuggestionCount: getRawLiveSuggestionCount(raw),
        frontendMapperSuggestionCount: mapped.suggestions.length,
        reactStateSuggestionCount: activeSuggestions.length,
        renderedSuggestionCount,
      };
      console.info("[GCC live insights] production pipeline trace", counts);

      expect(counts.backendOutputSuggestionCount).toBeGreaterThan(0);
      expect(counts.frontendMapperSuggestionCount).toBe(counts.backendOutputSuggestionCount);
      expect(counts.reactStateSuggestionCount).toBe(counts.frontendMapperSuggestionCount);
      expect(counts.renderedSuggestionCount).toBe(counts.reactStateSuggestionCount);
    },
  );
});
