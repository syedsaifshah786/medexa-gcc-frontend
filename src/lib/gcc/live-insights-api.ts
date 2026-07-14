import type {
  GCCLiveInsightsPatient,
  GCCLiveInsightsResponse,
  GCCLiveClaimImpact,
  GCCLiveSuggestion,
  GCCLiveSuggestionCategory,
  GCCLiveSuggestionPriority,
  GCCLiveSuggestionStatus,
  GCCLiveTranscriptSegment,
} from "@/types/gcc-live-insights";
import type { GCCLocale } from "@/i18n/types";

const suggestionCategories = new Set<GCCLiveSuggestionCategory>([
  "protocol_question",
  "clinical_prompt",
  "documentation",
  "billing",
  "compliance",
  "safety",
]);

const suggestionPriorities = new Set<GCCLiveSuggestionPriority>(["low", "medium", "high"]);
const suggestionStatuses = new Set<GCCLiveSuggestionStatus>(["active", "approved", "ignored", "resolved"]);
const claimImpacts = new Set<GCCLiveClaimImpact>(["none", "warning", "blocking"]);
const nonAlphaNumericPattern = new RegExp("[^\\p{L}\\p{N}]+", "gu");

type JsonRecord = Record<string, unknown>;

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
  signal: AbortSignal;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): JsonRecord {
  if (!isRecord(value)) {
    throw new Error(`Live insights returned an invalid ${field}.`);
  }
  return value;
}

function readString(record: JsonRecord, camelKey: string, snakeKey = camelKey) {
  const value = record[camelKey] ?? record[snakeKey];
  return typeof value === "string" ? value.trim() : "";
}

function requireString(record: JsonRecord, camelKey: string, snakeKey = camelKey) {
  const value = readString(record, camelKey, snakeKey);
  if (!value) {
    throw new Error("Live insights returned an incomplete suggestion.");
  }
  return value;
}

function requireNonNegativeInteger(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Live insights returned an invalid ${field}.`);
  }
  return value;
}

function normalizeFingerprintPart(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(nonAlphaNumericPattern, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createGCCSuggestionFingerprint(
  category: GCCLiveSuggestionCategory,
  _title: string,
  evidence: string,
) {
  return [category, normalizeFingerprintPart(evidence)].join("|");
}

function parseSuggestion(value: unknown, receivedAt: string): GCCLiveSuggestion {
  const suggestion = requireRecord(value, "suggestion");
  const category = readString(suggestion, "category") as GCCLiveSuggestionCategory;
  if (!suggestionCategories.has(category)) {
    throw new Error("Live insights returned an invalid suggestion category.");
  }

  const title = requireString(suggestion, "title");
  const message = readString(suggestion, "message") || title;
  const evidence = requireString(suggestion, "evidence");
  const actionLabel = requireString(suggestion, "actionLabel", "action_label");
  const priority = readString(suggestion, "priority") as GCCLiveSuggestionPriority;
  if (!suggestionPriorities.has(priority)) {
    throw new Error("Live insights returned an invalid suggestion priority.");
  }

  const rawStatus = readString(suggestion, "status");
  const status = (rawStatus || "active") as GCCLiveSuggestionStatus;
  if (!suggestionStatuses.has(status)) {
    throw new Error("Live insights returned an invalid suggestion status.");
  }
  const rawClaimImpact = readString(suggestion, "claimImpact", "claim_impact");
  const claimImpact = (rawClaimImpact || "none") as GCCLiveClaimImpact;
  if (!claimImpacts.has(claimImpact)) {
    throw new Error("Live insights returned an invalid claim impact.");
  }

  const fallbackFingerprint = createGCCSuggestionFingerprint(category, title, evidence);
  const suppliedId = readString(suggestion, "id");
  const fingerprint = readString(suggestion, "fingerprint") || suppliedId || fallbackFingerprint;
  const id = suppliedId || fingerprint;
  const rawConfidence = suggestion.confidence;
  const confidence =
    rawConfidence === null || rawConfidence === undefined
      ? null
      : typeof rawConfidence === "number" && Number.isFinite(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 1
        ? rawConfidence
        : null;

  return {
    id,
    fingerprint,
    category,
    title,
    message,
    evidence,
    priority,
    confidence,
    actionLabel,
    status,
    claimImpact,
    createdAt: readString(suggestion, "createdAt", "created_at") || receivedAt,
    updatedAt: readString(suggestion, "updatedAt", "updated_at") || receivedAt,
  };
}

export function parseGCCLiveInsightsResponse(
  value: unknown,
  expectedLanguage?: GCCLocale,
): GCCLiveInsightsResponse {
  const response = requireRecord(value, "response");
  const language = readString(response, "language") as GCCLocale;
  const locale = readString(response, "locale") as "en-US" | "ar-SA";
  if (
    expectedLanguage &&
    (language !== expectedLanguage || locale !== (expectedLanguage === "ar" ? "ar-SA" : "en-US"))
  ) {
    throw new Error("Live insights returned a mismatched language.");
  }
  const sessionId = requireString(response, "sessionId", "session_id");
  const transcriptRevision = requireNonNegativeInteger(
    response.transcriptRevision ?? response.transcript_revision,
    "transcript revision",
  );
  const rawSuggestions = response.suggestions;
  if (!Array.isArray(rawSuggestions) || rawSuggestions.length > 5) {
    throw new Error("Live insights returned an invalid suggestions list.");
  }

  const receivedAt = new Date().toISOString();
  const suggestionsByFingerprint = new Map<string, GCCLiveSuggestion>();
  rawSuggestions.forEach((suggestion) => {
    const parsed = parseSuggestion(suggestion, receivedAt);
    suggestionsByFingerprint.set(parsed.fingerprint, parsed);
  });

  const rawReadiness = requireRecord(response.claimReadiness ?? response.claim_readiness, "claim readiness");
  const blockingIssues = requireNonNegativeInteger(
    rawReadiness.blockingIssues ?? rawReadiness.blocking_issues,
    "claim blocking issue count",
  );
  const warnings = requireNonNegativeInteger(rawReadiness.warnings, "claim warning count");
  const summary = requireString(rawReadiness, "summary");

  return {
    language: language || expectedLanguage || "en",
    locale: locale || (expectedLanguage === "ar" ? "ar-SA" : "en-US"),
    sessionId,
    transcriptRevision,
    suggestions: [...suggestionsByFingerprint.values()],
    claimReadiness: {
      blockingIssues,
      warnings,
      summary,
    },
  };
}

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
  signal,
}: GCCLiveInsightsRequestInput) {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
  if (!apiBaseUrl) {
    throw new Error("Live insights are not configured.");
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
    }),
  });

  if (!response.ok) {
    throw new Error("Live insights request failed.");
  }

  return parseGCCLiveInsightsResponse(await response.json(), locale);
}
