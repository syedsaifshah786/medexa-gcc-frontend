import type { GCCLocale } from "@/i18n/types";
import type { SBSMatch } from "@/types/sbs-v3";

export type GCCLiveSuggestionCategory =
  | "clinical"
  | "protocol"
  | "protocol_ask"
  | "detected"
  | "warning"
  | "protocol_question"
  | "clinical_prompt"
  | "documentation"
  | "billing"
  | "compliance"
  | "safety";

export type GCCLiveSuggestionPriority = "low" | "medium" | "high";

export type GCCLiveSuggestionStatus = "active" | "approved" | "ignored" | "resolved";
export type GCCLiveClaimImpact = "none" | "warning" | "blocking";

export type GCCLiveSuggestion = {
  id: string;
  fingerprint: string;
  category: GCCLiveSuggestionCategory;
  title: string;
  message: string;
  evidence: string | null;
  priority: GCCLiveSuggestionPriority;
  confidence: number | null;
  actionLabel: string;
  status: GCCLiveSuggestionStatus;
  claimImpact: GCCLiveClaimImpact;
  createdAt: string;
  updatedAt: string;
};

export type GCCClaimReadiness = {
  blockingIssues: number;
  warnings: number;
  summary: string;
};

export type GCCLiveInsightsResponse = {
  language: GCCLocale;
  locale: "en-US" | "ar-SA";
  sessionId: string;
  transcriptRevision: number;
  suggestions: GCCLiveSuggestion[];
  claimReadiness: GCCClaimReadiness | null;
  fallbackReason: string | null;
  retryAfterSeconds: number | null;
  provider: string;
  model: string;
};

export type GCCLiveInsightsStatus = "idle" | "analyzing" | "retrying" | "updated" | "paused" | "unavailable";

export type GCCLiveInsightsPatient = {
  id: string | null;
  name: string | null;
  sessionType: string | null;
};

export type GCCLiveTranscriptSegment = {
  id: string;
  speaker?: "clinician" | "patient" | "unknown";
  text: string;
  timestampMs: number;
  isFinal: boolean;
};

export type UseGCCLiveInsightsOptions = {
  locale: GCCLocale;
  sessionId: string | null;
  isRecording: boolean;
  isPaused: boolean;
  isFinalizing: boolean;
  transcriptRevision: number;
  finalizedTranscript: string;
  interimTranscript: string;
  transcriptSegments: readonly GCCLiveTranscriptSegment[];
  elapsedMs: number;
  patient?: GCCLiveInsightsPatient | null;
  sbsMatches?: readonly SBSMatch[];
  approvedSuggestionIds?: readonly string[];
  ignoredSuggestionIds?: readonly string[];
};

export type UseGCCLiveInsightsResult = {
  suggestions: GCCLiveSuggestion[];
  activeSuggestions: GCCLiveSuggestion[];
  claimReadiness: GCCClaimReadiness | null;
  status: GCCLiveInsightsStatus;
  lastUpdatedAt: number | null;
  approveSuggestion: (fingerprint: string) => void;
  ignoreSuggestion: (fingerprint: string) => void;
};
