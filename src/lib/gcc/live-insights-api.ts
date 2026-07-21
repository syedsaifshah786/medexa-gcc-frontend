import type {
  GCCLiveInsightsPatient,
  GCCLiveSuggestion,
  GCCLiveTranscriptSegment,
} from "@/types/gcc-live-insights";
import type { GCCLocale } from "@/i18n/types";
import type { SBSMatch } from "@/types/sbs-v3";
import { getRawLiveSuggestionCount, mapLiveInsightsResponse } from "@/lib/api/map-live-insights-response";

export type GCCLiveInsightsRequestInput = {
  locale: GCCLocale;
  sessionId: string;
  transcriptRevision: number;
  elapsedMs: number;
  recentTranscript: string;
  recentSegments: readonly GCCLiveTranscriptSegment[];
  patient: GCCLiveInsightsPatient | null | undefined;
  existingSuggestions: readonly GCCLiveSuggestion[];
  approvedSuggestionIds: readonly string[];
  ignoredSuggestionIds: readonly string[];
  sbsMatches: readonly SBSMatch[];
  signal: AbortSignal;
};

function serializeSuggestion(suggestion: GCCLiveSuggestion) {
  return {
    id: suggestion.id,
    fingerprint: suggestion.fingerprint,
    category: suggestion.category,
    title: suggestion.title,
    message: suggestion.message,
    evidence: suggestion.evidence,
    priority: suggestion.priority,
    confidence: suggestion.confidence,
    action_label: suggestion.actionLabel,
    status: suggestion.status,
    claim_impact: suggestion.claimImpact,
    created_at: suggestion.createdAt,
    updated_at: suggestion.updatedAt,
  };
}

function nullableTrimmedString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export async function requestGCCLiveInsights({
  locale,
  sessionId,
  transcriptRevision,
  elapsedMs,
  recentTranscript,
  recentSegments,
  patient,
  existingSuggestions,
  approvedSuggestionIds,
  ignoredSuggestionIds,
  sbsMatches,
  signal,
}: GCCLiveInsightsRequestInput) {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

  if (process.env.NODE_ENV === "development") {
    console.debug("[GCC live insights] request started", {
      hasSessionId: Boolean(sessionId),
      transcriptRevision,
      transcriptLength: recentTranscript.length,
      segmentCount: recentSegments.length,
      sbsMatchCount: sbsMatches.length,
    });
  }

  const response = await fetch(`${apiBaseUrl}/sessions/${encodeURIComponent(sessionId)}/live-insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    signal,
    body: JSON.stringify({
      session_id: sessionId,
      language: locale,
      locale: locale === "ar" ? "ar-SA" : "en-US",
      transcript_revision: transcriptRevision,
      elapsed_ms: Math.max(0, Math.round(elapsedMs)),
      recent_transcript: recentTranscript,
      recent_segments: recentSegments.map((segment) => ({
        id: segment.id,
        speaker: segment.speaker,
        text: segment.text,
        timestamp_ms: Math.max(0, Math.round(segment.timestampMs)),
        is_final: segment.isFinal,
      })),
      patient: {
        id: nullableTrimmedString(patient?.id),
        name: nullableTrimmedString(patient?.name),
        session_type: nullableTrimmedString(patient?.sessionType),
      },
      existing_suggestions: existingSuggestions.map(serializeSuggestion),
      approved_suggestion_ids: [...new Set(approvedSuggestionIds)],
      ignored_suggestion_ids: [...new Set(ignoredSuggestionIds)],
      sbs_matches: sbsMatches.map((match) => ({
        id: match.id,
        segment_id: match.segmentId,
        code: match.code,
        official_title: match.officialTitle,
        matched_text: match.matchedText,
        normalized_match: match.normalizedMatch,
        start: match.start,
        end: match.end,
        confidence: match.confidence,
        detected_at: match.detectedAt,
      })),
    }),
  });

  if (!response.ok) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[GCC live insights] request failed", { status: response.status });
    }
    throw new Error("Live insights request failed.");
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[GCC live insights] response received", { status: response.status });
  }

  const raw = await response.json();
  const mapped = mapLiveInsightsResponse(raw, locale);
  if (process.env.NODE_ENV === "development") {
    console.debug("[GCC live insights] response mapped", {
      responseStatus: response.status,
      rawSuggestionCount: getRawLiveSuggestionCount(raw),
      mappedSuggestionCount: mapped.suggestions.length,
      fallbackReason: mapped.fallbackReason,
    });
  }
  return mapped;
}
