"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { requestGCCLiveInsights } from "@/lib/gcc/live-insights-api";
import type {
  GCCClaimReadiness,
  GCCLiveInsightsPatient,
  GCCLiveInsightsStatus,
  GCCLiveSuggestion,
  GCCLiveTranscriptSegment,
  UseGCCLiveInsightsOptions,
  UseGCCLiveInsightsResult,
} from "@/types/gcc-live-insights";

const interimStabilityMs = 1_100;
const requestDebounceMs = 1_800;
const forcedUpdateMs = 4_500;
const minimumChangedCharacters = 24;
const rollingTranscriptCharacters = 1_600;
const recentSegmentLimit = 8;
const emptyIds: readonly string[] = [];

type InsightsState = {
  sessionId: string | null;
  suggestions: GCCLiveSuggestion[];
  claimReadiness: GCCClaimReadiness | null;
  status: Exclude<GCCLiveInsightsStatus, "paused">;
  lastUpdatedAt: number | null;
};

type StableInterimState = {
  sessionId: string | null;
  source: string;
  value: string;
};

type RequestCandidate = {
  sessionId: string | null;
  isRecording: boolean;
  isPaused: boolean;
  isFinalizing: boolean;
  transcript: string;
  transcriptSegments: readonly GCCLiveTranscriptSegment[];
  elapsedMs: number;
  patient: GCCLiveInsightsPatient | null | undefined;
};

const initialState: InsightsState = {
  sessionId: null,
  suggestions: [],
  claimReadiness: null,
  status: "idle",
  lastUpdatedAt: null,
};

function normalizeTranscript(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function joinTranscript(finalizedTranscript: string, stableInterimTranscript: string) {
  const finalized = normalizeTranscript(finalizedTranscript);
  const interim = normalizeTranscript(stableInterimTranscript);
  if (!interim) return finalized;
  if (finalized.toLowerCase().endsWith(interim.toLowerCase())) return finalized;
  return normalizeTranscript(`${finalized} ${interim}`);
}

function countChangedCharacters(previous: string, next: string) {
  if (previous === next) return 0;
  if (next.startsWith(previous)) return next.length - previous.length;
  if (previous.startsWith(next)) return previous.length - next.length;

  const sharedLength = Math.min(previous.length, next.length);
  let prefixLength = 0;
  while (prefixLength < sharedLength && previous[prefixLength] === next[prefixLength]) {
    prefixLength += 1;
  }

  let previousEnd = previous.length - 1;
  let nextEnd = next.length - 1;
  while (
    previousEnd >= prefixLength &&
    nextEnd >= prefixLength &&
    previous[previousEnd] === next[nextEnd]
  ) {
    previousEnd -= 1;
    nextEnd -= 1;
  }

  return Math.max(previousEnd - prefixLength + 1, nextEnd - prefixLength + 1);
}

function latestTranscriptWindow(transcript: string) {
  return transcript.slice(-rollingTranscriptCharacters).trim();
}

function latestFinalSegments(segments: readonly GCCLiveTranscriptSegment[]) {
  return segments
    .filter((segment) => segment.isFinal && normalizeTranscript(segment.text))
    .slice(-recentSegmentLimit)
    .map((segment) => ({
      text: normalizeTranscript(segment.text),
      timestampMs: Number.isFinite(segment.timestampMs) ? Math.max(0, segment.timestampMs) : 0,
      isFinal: true,
    }));
}

function normalizedIdSet(ids: readonly string[]) {
  return new Set(ids.map((id) => id.trim()).filter(Boolean));
}

function suggestionMatchesIds(suggestion: GCCLiveSuggestion, ids: ReadonlySet<string>) {
  return ids.has(suggestion.fingerprint) || ids.has(suggestion.id);
}

function withExclusionStatuses(
  suggestions: readonly GCCLiveSuggestion[],
  approvedIds: ReadonlySet<string>,
  ignoredIds: ReadonlySet<string>,
) {
  return suggestions.map((suggestion) => {
    if (suggestion.status === "approved" || suggestion.status === "ignored") {
      return suggestion;
    }
    if (suggestionMatchesIds(suggestion, approvedIds)) {
      return { ...suggestion, status: "approved" as const };
    }
    if (suggestionMatchesIds(suggestion, ignoredIds)) {
      return { ...suggestion, status: "ignored" as const };
    }
    return suggestion;
  });
}

function upsertSuggestions(
  currentSuggestions: readonly GCCLiveSuggestion[],
  incomingSuggestions: readonly GCCLiveSuggestion[],
  approvedIds: ReadonlySet<string>,
  ignoredIds: ReadonlySet<string>,
) {
  const suggestionsByFingerprint = new Map(
    currentSuggestions.map((suggestion) => [suggestion.fingerprint, suggestion]),
  );

  incomingSuggestions.forEach((incoming) => {
    if (incoming.status === "resolved") {
      suggestionsByFingerprint.delete(incoming.fingerprint);
      return;
    }

    const existing = suggestionsByFingerprint.get(incoming.fingerprint);
    let status = incoming.status;
    if (existing?.status === "approved" || existing?.status === "ignored") {
      status = existing.status;
    } else if (suggestionMatchesIds(incoming, approvedIds)) {
      status = "approved";
    } else if (suggestionMatchesIds(incoming, ignoredIds)) {
      status = "ignored";
    }

    suggestionsByFingerprint.set(incoming.fingerprint, {
      ...existing,
      ...incoming,
      id: existing?.id ?? incoming.id,
      createdAt: existing?.createdAt ?? incoming.createdAt,
      status,
    });
  });

  return [...suggestionsByFingerprint.values()];
}

function collectExclusionIds(
  sourceIds: ReadonlySet<string>,
  suggestions: readonly GCCLiveSuggestion[],
  status: "approved" | "ignored",
) {
  const result = new Set(sourceIds);
  suggestions.forEach((suggestion) => {
    if (suggestion.status === status || suggestionMatchesIds(suggestion, sourceIds)) {
      result.add(suggestion.id);
      result.add(suggestion.fingerprint);
    }
  });
  return [...result];
}

function readinessFromActiveSuggestions(suggestions: readonly GCCLiveSuggestion[]): GCCClaimReadiness {
  const activeSuggestions = suggestions.filter((suggestion) => suggestion.status === "active");
  const blockingIssues = activeSuggestions.filter((suggestion) => suggestion.claimImpact === "blocking").length;
  const warnings = activeSuggestions.filter((suggestion) => suggestion.claimImpact === "warning").length;

  if (blockingIssues > 0) {
    return {
      blockingIssues,
      warnings,
      summary: `${blockingIssues} ${blockingIssues === 1 ? "issue" : "issues"} found that may impact claim approval.`,
    };
  }

  if (warnings > 0) {
    return {
      blockingIssues,
      warnings,
      summary: `${warnings} ${warnings === 1 ? "item requires" : "items require"} clinician review.`,
    };
  }

  return { blockingIssues: 0, warnings: 0, summary: "No active documentation issues detected yet." };
}

function isAbortError(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export function useGCCLiveInsights({
  sessionId,
  isRecording,
  isPaused,
  isFinalizing,
  finalizedTranscript,
  interimTranscript,
  transcriptSegments,
  elapsedMs,
  patient,
  approvedSuggestionIds = emptyIds,
  ignoredSuggestionIds = emptyIds,
}: UseGCCLiveInsightsOptions): UseGCCLiveInsightsResult {
  const [state, setState] = useState<InsightsState>(initialState);
  const [stableInterimState, setStableInterimState] = useState<StableInterimState>({
    sessionId: null,
    source: "",
    value: "",
  });

  const activeSessionIdRef = useRef<string | null>(null);
  const suggestionsRef = useRef<GCCLiveSuggestion[]>([]);
  const localApprovedIdsRef = useRef(new Set<string>());
  const localIgnoredIdsRef = useRef(new Set<string>());
  const externalApprovedIdsRef = useRef<ReadonlySet<string>>(new Set());
  const externalIgnoredIdsRef = useRef<ReadonlySet<string>>(new Set());
  const latestCandidateRef = useRef<RequestCandidate>({
    sessionId: null,
    isRecording: false,
    isPaused: false,
    isFinalizing: false,
    transcript: "",
    transcriptSegments: [],
    elapsedMs: 0,
    patient: null,
  });
  const debounceTimerRef = useRef<number | null>(null);
  const forceTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const transcriptRevisionRef = useRef(0);
  const lastRequestedRevisionRef = useRef(0);
  const lastObservedTranscriptRef = useRef("");
  const lastRequestedTranscriptRef = useRef("");
  const lastAcceptedTranscriptRef = useRef("");
  const lastRequestStartedAtRef = useRef(0);
  const pendingChangeStartedAtRef = useRef<number | null>(null);

  const normalizedInterimTranscript = useMemo(() => normalizeTranscript(interimTranscript), [interimTranscript]);

  useEffect(() => {
    if (!normalizedInterimTranscript) return;

    const stableSessionId = sessionId;
    const stableSource = normalizedInterimTranscript;
    const timer = window.setTimeout(() => {
      setStableInterimState({
        sessionId: stableSessionId,
        source: stableSource,
        value: stableSource,
      });
    }, interimStabilityMs);

    return () => window.clearTimeout(timer);
  }, [normalizedInterimTranscript, sessionId]);

  const stableInterimTranscript =
    stableInterimState.sessionId === sessionId && stableInterimState.source === normalizedInterimTranscript
      ? stableInterimState.value
      : "";
  const requestTranscript = useMemo(
    () => joinTranscript(finalizedTranscript, stableInterimTranscript),
    [finalizedTranscript, stableInterimTranscript],
  );

  const externalApprovedIds = useMemo(() => normalizedIdSet(approvedSuggestionIds), [approvedSuggestionIds]);
  const externalIgnoredIds = useMemo(() => normalizedIdSet(ignoredSuggestionIds), [ignoredSuggestionIds]);

  useEffect(() => {
    externalApprovedIdsRef.current = externalApprovedIds;
    externalIgnoredIdsRef.current = externalIgnoredIds;
  }, [externalApprovedIds, externalIgnoredIds]);

  useEffect(() => {
    latestCandidateRef.current = {
      sessionId,
      isRecording,
      isPaused,
      isFinalizing,
      transcript: requestTranscript,
      transcriptSegments,
      elapsedMs,
      patient,
    };
  }, [elapsedMs, isFinalizing, isPaused, isRecording, patient, requestTranscript, sessionId, transcriptSegments]);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const clearForceTimer = useCallback(() => {
    if (forceTimerRef.current !== null) {
      window.clearTimeout(forceTimerRef.current);
      forceTimerRef.current = null;
    }
  }, []);

  const clearScheduledRequests = useCallback(() => {
    clearDebounceTimer();
    clearForceTimer();
    pendingChangeStartedAtRef.current = null;
  }, [clearDebounceTimer, clearForceTimer]);

  const abortCurrentRequest = useCallback(() => {
    if (!abortControllerRef.current) return;
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  }, []);

  const mergedApprovedIds = useCallback(() => {
    return new Set([...externalApprovedIdsRef.current, ...localApprovedIdsRef.current]);
  }, []);

  const mergedIgnoredIds = useCallback(() => {
    return new Set([...externalIgnoredIdsRef.current, ...localIgnoredIdsRef.current]);
  }, []);

  const runRequest = useCallback(async () => {
    const candidate = latestCandidateRef.current;
    if (
      !candidate.sessionId ||
      candidate.sessionId !== activeSessionIdRef.current ||
      !candidate.isRecording ||
      candidate.isPaused ||
      candidate.isFinalizing ||
      !candidate.transcript
    ) {
      return;
    }

    const requestRevision = transcriptRevisionRef.current;
    if (
      requestRevision <= lastRequestedRevisionRef.current ||
      countChangedCharacters(lastRequestedTranscriptRef.current, candidate.transcript) < minimumChangedCharacters
    ) {
      return;
    }

    clearScheduledRequests();
    abortCurrentRequest();

    const controller = new AbortController();
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    abortControllerRef.current = controller;
    lastRequestedRevisionRef.current = requestRevision;
    lastRequestedTranscriptRef.current = candidate.transcript;
    lastRequestStartedAtRef.current = Date.now();

    const approvedIds = mergedApprovedIds();
    const ignoredIds = mergedIgnoredIds();
    approvedIds.forEach((id) => ignoredIds.delete(id));
    const existingSuggestions = withExclusionStatuses(suggestionsRef.current, approvedIds, ignoredIds);
    const approvedExclusions = collectExclusionIds(approvedIds, existingSuggestions, "approved");
    const ignoredExclusions = collectExclusionIds(ignoredIds, existingSuggestions, "ignored");

    setState((current) => ({
      sessionId: candidate.sessionId,
      suggestions: current.sessionId === candidate.sessionId ? current.suggestions : [],
      claimReadiness: current.sessionId === candidate.sessionId ? current.claimReadiness : null,
      status: "analyzing",
      lastUpdatedAt: current.sessionId === candidate.sessionId ? current.lastUpdatedAt : null,
    }));

    try {
      const response = await requestGCCLiveInsights({
        sessionId: candidate.sessionId,
        transcriptRevision: requestRevision,
        elapsedMs: candidate.elapsedMs,
        recentTranscript: latestTranscriptWindow(candidate.transcript),
        recentSegments: latestFinalSegments(candidate.transcriptSegments),
        patient: candidate.patient,
        existingSuggestions,
        approvedSuggestionIds: approvedExclusions,
        ignoredSuggestionIds: ignoredExclusions,
        signal: controller.signal,
      });

      if (
        requestSequence !== requestSequenceRef.current ||
        candidate.sessionId !== activeSessionIdRef.current ||
        response.sessionId !== candidate.sessionId ||
        response.transcriptRevision !== requestRevision
      ) {
        return;
      }

      if (response.transcriptRevision < transcriptRevisionRef.current) {
        setState((current) =>
          current.sessionId === candidate.sessionId && current.status === "analyzing"
            ? { ...current, status: current.lastUpdatedAt ? "updated" : "idle" }
            : current,
        );
        return;
      }

      const currentApprovedIds = mergedApprovedIds();
      const currentIgnoredIds = mergedIgnoredIds();
      const nextSuggestions = upsertSuggestions(
        suggestionsRef.current,
        response.suggestions,
        currentApprovedIds,
        currentIgnoredIds,
      );
      suggestionsRef.current = nextSuggestions;
      lastAcceptedTranscriptRef.current = candidate.transcript;
      const updatedAt = Date.now();
      setState({
        sessionId: candidate.sessionId,
        suggestions: nextSuggestions,
        claimReadiness: response.claimReadiness,
        status: "updated",
        lastUpdatedAt: updatedAt,
      });
    } catch (error) {
      if (isAbortError(error)) {
        if (
          requestSequence === requestSequenceRef.current &&
          candidate.sessionId === activeSessionIdRef.current
        ) {
          setState((current) =>
            current.sessionId === candidate.sessionId && current.status === "analyzing"
              ? { ...current, status: current.lastUpdatedAt ? "updated" : "idle" }
              : current,
          );
        }
        return;
      }
      if (requestSequence !== requestSequenceRef.current) return;
      setState((current) =>
        current.sessionId === candidate.sessionId
          ? { ...current, status: "unavailable" }
          : {
              sessionId: candidate.sessionId,
              suggestions: [],
              claimReadiness: null,
              status: "unavailable",
              lastUpdatedAt: null,
            },
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [abortCurrentRequest, clearScheduledRequests, mergedApprovedIds, mergedIgnoredIds]);

  useEffect(() => {
    if (activeSessionIdRef.current !== sessionId) {
      clearScheduledRequests();
      abortCurrentRequest();
      activeSessionIdRef.current = sessionId;
      suggestionsRef.current = [];
      localApprovedIdsRef.current.clear();
      localIgnoredIdsRef.current.clear();
      transcriptRevisionRef.current = 0;
      lastRequestedRevisionRef.current = 0;
      lastObservedTranscriptRef.current = "";
      lastRequestedTranscriptRef.current = "";
      lastAcceptedTranscriptRef.current = "";
      lastRequestStartedAtRef.current = 0;
    }

    const canRequest = Boolean(sessionId && isRecording && !isPaused && !isFinalizing && requestTranscript);
    if (!canRequest) {
      if (isPaused && requestTranscript !== lastAcceptedTranscriptRef.current) {
        // A meaningful finalized phrase may already be waiting on the debounce
        // timer when the clinician pauses. Re-observe it after resume instead of
        // treating the cancelled work as analyzed.
        lastObservedTranscriptRef.current = lastAcceptedTranscriptRef.current;
        lastRequestedTranscriptRef.current = lastAcceptedTranscriptRef.current;
      }
      clearScheduledRequests();
      abortCurrentRequest();
      return;
    }

    if (requestTranscript === lastObservedTranscriptRef.current) return;
    lastObservedTranscriptRef.current = requestTranscript;
    transcriptRevisionRef.current += 1;

    const changedCharacters = countChangedCharacters(lastRequestedTranscriptRef.current, requestTranscript);
    if (changedCharacters < minimumChangedCharacters) {
      clearScheduledRequests();
      return;
    }

    const now = Date.now();
    if (pendingChangeStartedAtRef.current === null) {
      pendingChangeStartedAtRef.current = now;
    }

    clearDebounceTimer();
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void runRequest();
    }, requestDebounceMs);

    if (forceTimerRef.current === null) {
      const forceBaseline = lastRequestStartedAtRef.current || pendingChangeStartedAtRef.current;
      const forceDelay = Math.max(0, forceBaseline + forcedUpdateMs - now);
      forceTimerRef.current = window.setTimeout(() => {
        forceTimerRef.current = null;
        void runRequest();
      }, forceDelay);
    }
  }, [
    abortCurrentRequest,
    clearDebounceTimer,
    clearScheduledRequests,
    isFinalizing,
    isPaused,
    isRecording,
    requestTranscript,
    runRequest,
    sessionId,
  ]);

  useEffect(
    () => () => {
      clearScheduledRequests();
      abortCurrentRequest();
      requestSequenceRef.current += 1;
      lastObservedTranscriptRef.current = "";
    },
    [abortCurrentRequest, clearScheduledRequests],
  );

  const approveSuggestion = useCallback(
    (fingerprint: string) => {
      const normalizedFingerprint = fingerprint.trim();
      if (!normalizedFingerprint || activeSessionIdRef.current !== sessionId) return;
      localApprovedIdsRef.current.add(normalizedFingerprint);
      localIgnoredIdsRef.current.delete(normalizedFingerprint);
      suggestionsRef.current = suggestionsRef.current.map((suggestion) =>
        suggestion.fingerprint === normalizedFingerprint ? { ...suggestion, status: "approved" } : suggestion,
      );
      setState((current) =>
        current.sessionId === sessionId
          ? {
              ...current,
              suggestions: suggestionsRef.current,
              claimReadiness: current.claimReadiness
                ? readinessFromActiveSuggestions(suggestionsRef.current)
                : null,
            }
          : current,
      );
    },
    [sessionId],
  );

  const ignoreSuggestion = useCallback(
    (fingerprint: string) => {
      const normalizedFingerprint = fingerprint.trim();
      if (!normalizedFingerprint || activeSessionIdRef.current !== sessionId) return;
      localIgnoredIdsRef.current.add(normalizedFingerprint);
      localApprovedIdsRef.current.delete(normalizedFingerprint);
      suggestionsRef.current = suggestionsRef.current.map((suggestion) =>
        suggestion.fingerprint === normalizedFingerprint ? { ...suggestion, status: "ignored" } : suggestion,
      );
      setState((current) =>
        current.sessionId === sessionId
          ? {
              ...current,
              suggestions: suggestionsRef.current,
              claimReadiness: current.claimReadiness
                ? readinessFromActiveSuggestions(suggestionsRef.current)
                : null,
            }
          : current,
      );
    },
    [sessionId],
  );

  const isCurrentSession = state.sessionId === sessionId;
  const suggestions = useMemo(
    () =>
      withExclusionStatuses(
        isCurrentSession ? state.suggestions : [],
        externalApprovedIds,
        externalIgnoredIds,
      ),
    [externalApprovedIds, externalIgnoredIds, isCurrentSession, state.suggestions],
  );
  const activeSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === "active"),
    [suggestions],
  );

  let status: GCCLiveInsightsStatus = isCurrentSession ? state.status : "idle";
  if (isPaused) {
    status = "paused";
  } else if (!isRecording || isFinalizing) {
    status = "idle";
  }

  return {
    suggestions,
    activeSuggestions,
    claimReadiness: isCurrentSession ? state.claimReadiness : null,
    status,
    lastUpdatedAt: isCurrentSession ? state.lastUpdatedAt : null,
    approveSuggestion,
    ignoreSuggestion,
  };
}
