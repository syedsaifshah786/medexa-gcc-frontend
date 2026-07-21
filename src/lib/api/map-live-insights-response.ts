import type {
  GCCClaimReadiness,
  GCCLiveClaimImpact,
  GCCLiveInsightsResponse,
  GCCLiveSuggestion,
  GCCLiveSuggestionCategory,
  GCCLiveSuggestionPriority,
  GCCLiveSuggestionStatus,
} from "@/types/gcc-live-insights";
import type { GCCLocale } from "@/i18n/types";

type JsonRecord = Record<string, unknown>;

const categories = new Set<GCCLiveSuggestionCategory>([
  "clinical",
  "documentation",
  "protocol",
  "protocol_ask",
  "billing",
  "detected",
  "compliance",
  "warning",
  "protocol_question",
  "clinical_prompt",
  "safety",
]);
const categoryAliases: Record<string, GCCLiveSuggestionCategory> = {
  clinical_question: "clinical",
  follow_up: "clinical",
  follow_up_question: "clinical",
  documentation_gap: "documentation",
  safety_alert: "warning",
};
const priorities = new Set<GCCLiveSuggestionPriority>(["low", "medium", "high"]);
const statuses = new Set<GCCLiveSuggestionStatus>(["active", "approved", "ignored", "resolved"]);
const impacts = new Set<GCCLiveClaimImpact>(["none", "warning", "blocking"]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizedPart(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function category(value: unknown): GCCLiveSuggestionCategory {
  const normalized = typeof value === "string"
    ? normalizedPart(value).replace(/\s+/g, "_")
    : "";
  const aliased = categoryAliases[normalized] ?? normalized;
  return categories.has(aliased as GCCLiveSuggestionCategory)
    ? aliased as GCCLiveSuggestionCategory
    : "clinical";
}

function confidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = value > 1 && value <= 100 ? value / 100 : value;
  return normalized >= 0 && normalized <= 1 ? normalized : null;
}

function suggestion(value: unknown, receivedAt: string): GCCLiveSuggestion | null {
  if (!isRecord(value)) return null;
  const message = text(value, "message", "content", "description", "text");
  if (!message) return null;
  const normalizedCategory = category(value.category);
  const title = text(value, "title", "label", "heading") || "Clinical Insight";
  const evidence = text(value, "evidence") || null;
  const priorityValue = normalizedPart(text(value, "priority")) as GCCLiveSuggestionPriority;
  const priority = priorities.has(priorityValue) ? priorityValue : "medium";
  const statusValue = normalizedPart(text(value, "status")) as GCCLiveSuggestionStatus;
  const status = statuses.has(statusValue) ? statusValue : "active";
  const impactValue = normalizedPart(text(value, "claimImpact", "claim_impact")) as GCCLiveClaimImpact;
  const claimImpact = impacts.has(impactValue) ? impactValue : "none";
  const fallbackFingerprint = [normalizedCategory, title, message, evidence]
    .map(normalizedPart)
    .join("|");
  const fingerprint = text(value, "fingerprint") || fallbackFingerprint;
  const id = text(value, "id") || `live-${stableHash(fingerprint)}`;

  return {
    id,
    fingerprint,
    category: normalizedCategory,
    title,
    message,
    evidence,
    priority,
    confidence: confidence(value.confidence),
    actionLabel: text(value, "actionLabel", "action_label") || "Requires clinician review",
    status,
    claimImpact,
    createdAt: text(value, "createdAt", "created_at") || receivedAt,
    updatedAt: text(value, "updatedAt", "updated_at") || receivedAt,
  };
}

export function getRawLiveSuggestionCount(value: unknown) {
  if (!isRecord(value)) return 0;
  const data = isRecord(value.data) ? value.data : {};
  const items = value.suggestions ?? value.live_insights ?? value.items ?? data.suggestions;
  return Array.isArray(items) ? items.length : 0;
}

function readiness(value: unknown): GCCClaimReadiness | null {
  if (!isRecord(value)) return null;
  const blockingIssues = value.blockingIssues ?? value.blocking_issues;
  const warnings = value.warnings;
  const summary = text(value, "summary");
  return typeof blockingIssues === "number" && Number.isInteger(blockingIssues) && blockingIssues >= 0
    && typeof warnings === "number" && Number.isInteger(warnings) && warnings >= 0 && summary
    ? { blockingIssues, warnings, summary }
    : null;
}

export function mapLiveInsightsResponse(
  value: unknown,
  expectedLanguage: GCCLocale = "en",
): GCCLiveInsightsResponse {
  if (!isRecord(value)) throw new Error("Live insights returned an invalid response.");
  const data = isRecord(value.data) ? value.data : {};
  const rawItems = value.suggestions ?? value.live_insights ?? value.items ?? data.suggestions ?? [];
  if (!Array.isArray(rawItems)) throw new Error("Live insights returned an invalid suggestions list.");
  const sessionId = text(value, "sessionId", "session_id");
  const revision = value.transcriptRevision ?? value.transcript_revision;
  if (!sessionId || typeof revision !== "number" || !Number.isInteger(revision) || revision < 0) {
    throw new Error("Live insights returned invalid session metadata.");
  }
  const receivedAt = new Date().toISOString();
  const mapped = new Map<string, GCCLiveSuggestion>();
  rawItems.forEach((item) => {
    const normalized = suggestion(item, receivedAt);
    if (normalized) mapped.set(normalized.fingerprint, normalized);
  });
  const rawRetryAfter = value.retryAfterSeconds ?? value.retry_after_seconds;
  const retryAfterSeconds = typeof rawRetryAfter === "number" && rawRetryAfter > 0
    ? Math.ceil(rawRetryAfter)
    : null;
  const language = text(value, "language") as GCCLocale || expectedLanguage;
  const locale = text(value, "locale") as "en-US" | "ar-SA" || (language === "ar" ? "ar-SA" : "en-US");

  return {
    language,
    locale,
    sessionId,
    transcriptRevision: revision,
    suggestions: [...mapped.values()],
    claimReadiness: readiness(value.claimReadiness ?? value.claim_readiness),
    fallbackReason: text(value, "fallbackReason", "fallback_reason") || null,
    retryAfterSeconds,
    provider: text(value, "provider") || "groq",
    model: text(value, "model"),
  };
}
