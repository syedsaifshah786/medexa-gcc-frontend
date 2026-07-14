export type GCCLiveSuggestionCategory =
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
  evidence: string;
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
  sessionId: string;
  transcriptRevision: number;
  suggestions: GCCLiveSuggestion[];
  claimReadiness: GCCClaimReadiness;
};

export type GCCLiveInsightsStatus = "idle" | "analyzing" | "updated" | "paused" | "unavailable";

export type GCCLiveInsightsPatient = {
  id: string | null;
  name: string | null;
  sessionType: string | null;
};

export type GCCLiveTranscriptSegment = {
  text: string;
  timestampMs: number;
  isFinal: boolean;
};

export type UseGCCLiveInsightsOptions = {
  sessionId: string | null;
  isRecording: boolean;
  isPaused: boolean;
  isFinalizing: boolean;
  finalizedTranscript: string;
  interimTranscript: string;
  transcriptSegments: readonly GCCLiveTranscriptSegment[];
  elapsedMs: number;
  patient?: GCCLiveInsightsPatient | null;
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
