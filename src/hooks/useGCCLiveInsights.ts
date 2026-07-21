"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { translate } from "@/i18n";
import type { GCCLocale } from "@/i18n/types";
import { requestGCCLiveInsights } from "@/lib/gcc/live-insights-api";
import {
  activeLiveSuggestions,
  suggestionMatchesIds,
  upsertLiveSuggestions,
  withLiveSuggestionStatuses,
} from "@/lib/live-insights/upsert-live-suggestions";
import { formatNumber, GCC_LOCALE_TAGS } from "@/lib/i18n/formatters";
import type {
  GCCClaimReadiness,
  GCCLiveInsightsPatient,
  GCCLiveInsightsStatus,
  GCCLiveSuggestion,
  GCCLiveTranscriptSegment,
  UseGCCLiveInsightsOptions,
  UseGCCLiveInsightsResult,
} from "@/types/gcc-live-insights";
import type { SBSMatch } from "@/types/sbs-v3";

const interimStabilityMs = 1_200;
const requestDebounceMs = 2_200;
const maximumWaitMs = 5_000;
const minimumChangedCharacters = 25;
const minimumRequestIntervalMs = 2_500;
const minimumSuccessfulIntervalMs = 4_000;
const rollingTranscriptCharacters = 1_600;
const recentSegmentLimit = 8;
const emptyIds: readonly string[] = [];

type InsightsState = {
  sessionId: string | null;
  locale: GCCLocale | null;
  suggestions: GCCLiveSuggestion[];
  claimReadiness: GCCClaimReadiness | null;
  status: Exclude<GCCLiveInsightsStatus, "paused">;
  lastUpdatedAt: number | null;
};

type StableInterimState = {
  sessionId: string | null;
  locale: GCCLocale | null;
  source: string;
  value: string;
};

type RequestCandidate = {
  sessionId: string | null;
  locale: GCCLocale;
  isRecording: boolean;
  isPaused: boolean;
  isFinalizing: boolean;
  isProvisional: boolean;
  provisionalText: string;
  transcript: string;
  transcriptSegments: readonly GCCLiveTranscriptSegment[];
  elapsedMs: number;
  patient: GCCLiveInsightsPatient | null | undefined;
  sbsMatches: readonly SBSMatch[];
};

const initialState: InsightsState = {
  sessionId: null,
  locale: null,
  suggestions: [],
  claimReadiness: null,
  status: "idle",
  lastUpdatedAt: null,
};

function normalizeTranscript(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:،؛؟])/g, "$1")
    .trim();
}

function joinTranscript(finalizedTranscript: string, stableInterimTranscript: string) {
  const finalized = normalizeTranscript(finalizedTranscript);
  const interim = normalizeTranscript(stableInterimTranscript);
  if (!interim) return finalized;
  if (finalized.toLocaleLowerCase().endsWith(interim.toLocaleLowerCase())) return finalized;
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
      id: segment.id,
      speaker: segment.speaker ?? "unknown",
      timestampMs: Number.isFinite(segment.timestampMs) ? Math.max(0, segment.timestampMs) : 0,
      isFinal: true,
    }));
}

function relevantSBSMatches(
  matches: readonly SBSMatch[],
  transcriptWindow: string,
  segments: readonly GCCLiveTranscriptSegment[],
) {
  const segmentIds = new Set(segments.map((segment) => segment.id));
  const normalizedWindow = normalizeTranscript(transcriptWindow).toLocaleLowerCase();
  return matches
    .filter((match) =>
      segmentIds.has(match.segmentId) ||
      (Boolean(match.matchedText) && normalizedWindow.includes(normalizeTranscript(match.matchedText).toLocaleLowerCase())),
    )
    .slice(-30);
}

function normalizedIdSet(ids: readonly string[]) {
  return new Set(ids.map((id) => id.trim()).filter(Boolean));
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

function readinessSummaryKey(
  kind: "issues" | "reviewItems",
  count: number,
  locale: GCCLocale,
) {
  const plural = new Intl.PluralRules(GCC_LOCALE_TAGS[locale]).select(count);
  const form = plural === "one" || plural === "two" ? plural : "other";
  return `session.claimReadiness.${kind}.${form}`;
}

function readinessFromActiveSuggestions(
  suggestions: readonly GCCLiveSuggestion[],
  locale: GCCLocale,
): GCCClaimReadiness {
  const activeSuggestions = activeLiveSuggestions(suggestions);
  const blockingIssues = activeSuggestions.filter((suggestion) => suggestion.claimImpact === "blocking").length;
  const warnings = activeSuggestions.filter((suggestion) => suggestion.claimImpact === "warning").length;

  if (blockingIssues > 0) {
    return {
      blockingIssues,
      warnings,
      summary: translate(locale, readinessSummaryKey("issues", blockingIssues, locale), {
        count: formatNumber(blockingIssues, locale),
      }),
    };
  }

  if (warnings > 0) {
    return {
      blockingIssues,
      warnings,
      summary: translate(locale, readinessSummaryKey("reviewItems", warnings, locale), {
        count: formatNumber(warnings, locale),
      }),
    };
  }

  return {
    blockingIssues: 0,
    warnings: 0,
    summary: translate(locale, "session.claimReadiness.noIssues"),
  };
}

function isAbortError(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export function useGCCLiveInsights({
  locale,
  sessionId,
  isRecording,
  isPaused,
  isFinalizing,
  transcriptRevision,
  finalizedTranscript,
  interimTranscript,
  transcriptSegments,
  elapsedMs,
  patient,
  sbsMatches = [],
  approvedSuggestionIds = emptyIds,
  ignoredSuggestionIds = emptyIds,
}: UseGCCLiveInsightsOptions): UseGCCLiveInsightsResult {
  const [state, setState] = useState<InsightsState>(initialState);
  const [stableInterimState, setStableInterimState] = useState<StableInterimState>({
    sessionId: null,
    locale: null,
    source: "",
    value: "",
  });

  const activeSessionIdRef = useRef<string | null>(null);
  const activeLocaleRef = useRef<GCCLocale>(locale);
  const suggestionsRef = useRef<GCCLiveSuggestion[]>([]);
  const localApprovedIdsRef = useRef(new Set<string>());
  const localIgnoredIdsRef = useRef(new Set<string>());
  const externalApprovedIdsRef = useRef<ReadonlySet<string>>(new Set());
  const externalIgnoredIdsRef = useRef<ReadonlySet<string>>(new Set());
  const latestCandidateRef = useRef<RequestCandidate>({
    sessionId: null,
    locale,
    isRecording: false,
    isPaused: false,
    isFinalizing: false,
    isProvisional: false,
    provisionalText: "",
    transcript: "",
    transcriptSegments: [],
    elapsedMs: 0,
    patient: null,
    sbsMatches: [],
  });
  const debounceTimerRef = useRef<number | null>(null);
  const forceTimerRef = useRef<number | null>(null);
  const liveInsightsAbortControllerRef = useRef<AbortController | null>(null);
  const liveInsightsInFlightRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const analysisRevisionRef = useRef(0);
  const lastCompletedSequenceRef = useRef(0);
  const lastAnalyzedRevisionRef = useRef(0);
  const lastAnalyzedTextLengthRef = useRef(0);
  const lastObservedTranscriptRef = useRef("");
  const lastObservedFinalRevisionRef = useRef(0);
  const lastRequestedTranscriptRef = useRef("");
  const lastAcceptedTranscriptRef = useRef("");
  const lastRequestedAtRef = useRef(0);
  const lastSuccessfulRequestAtRef = useRef(0);
  const lastAnalyzedWasProvisionalRef = useRef(false);
  const pendingChangeStartedAtRef = useRef<number | null>(null);
  const runRequestRef = useRef<() => Promise<void>>(async () => undefined);

  const normalizedInterimTranscript = useMemo(
    () => normalizeTranscript(interimTranscript),
    [interimTranscript],
  );
  useEffect(() => {
    if (!normalizedInterimTranscript) return;
    const timer = window.setTimeout(() => {
      setStableInterimState({
        sessionId,
        locale,
        source: normalizedInterimTranscript,
        value: normalizedInterimTranscript,
      });
    }, interimStabilityMs);
    return () => window.clearTimeout(timer);
  }, [locale, normalizedInterimTranscript, sessionId]);
  const stableInterimTranscript =
    stableInterimState.sessionId === sessionId
    && stableInterimState.locale === locale
    && stableInterimState.source === normalizedInterimTranscript
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
      locale,
      isRecording,
      isPaused,
      isFinalizing,
      isProvisional: Boolean(stableInterimTranscript),
      provisionalText: stableInterimTranscript,
      transcript: requestTranscript,
      transcriptSegments,
      elapsedMs,
      patient,
      sbsMatches,
    };
  }, [elapsedMs, isFinalizing, isPaused, isRecording, locale, patient, requestTranscript, sbsMatches, sessionId, stableInterimTranscript, transcriptSegments]);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const clearScheduledRequests = useCallback(() => {
    clearDebounceTimer();
    if (forceTimerRef.current !== null) {
      window.clearTimeout(forceTimerRef.current);
      forceTimerRef.current = null;
    }
    pendingChangeStartedAtRef.current = null;
  }, [clearDebounceTimer]);

  const abortCurrentRequest = useCallback(() => {
    if (!liveInsightsAbortControllerRef.current) return;
    liveInsightsAbortControllerRef.current.abort();
    liveInsightsAbortControllerRef.current = null;
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
      candidate.locale !== activeLocaleRef.current ||
      !candidate.isRecording ||
      candidate.isPaused ||
      candidate.isFinalizing ||
      !candidate.transcript
    ) {
      return;
    }
    if (liveInsightsInFlightRef.current) return;

    const requestRevision = analysisRevisionRef.current;
    const changedCharacters = countChangedCharacters(lastAcceptedTranscriptRef.current, candidate.transcript);
    const lengthGrowth = Math.abs(candidate.transcript.length - lastAnalyzedTextLengthRef.current);
    const replacesProvisional = lastAnalyzedWasProvisionalRef.current && !candidate.isProvisional;
    if (
      requestRevision <= lastAnalyzedRevisionRef.current
      || (!replacesProvisional && Math.max(changedCharacters, lengthGrowth) < minimumChangedCharacters)
    ) {
      return;
    }

    const now = Date.now();
    const earliestAllowedAt = Math.max(
      lastSuccessfulRequestAtRef.current + minimumSuccessfulIntervalMs,
      lastRequestedAtRef.current + minimumRequestIntervalMs,
    );
    if (now < earliestAllowedAt) {
      clearDebounceTimer();
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        void runRequestRef.current();
      }, earliestAllowedAt - now);
      return;
    }

    clearScheduledRequests();

    const controller = new AbortController();
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    liveInsightsAbortControllerRef.current = controller;
    liveInsightsInFlightRef.current = true;
    lastRequestedTranscriptRef.current = candidate.transcript;
    lastRequestedAtRef.current = now;
    let retryScheduled = false;

    const approvedIds = mergedApprovedIds();
    const ignoredIds = mergedIgnoredIds();
    approvedIds.forEach((id) => ignoredIds.delete(id));
    const existingSuggestions = withLiveSuggestionStatuses(suggestionsRef.current, approvedIds, ignoredIds);
    const approvedExclusions = collectExclusionIds(approvedIds, existingSuggestions, "approved");
    const ignoredExclusions = collectExclusionIds(ignoredIds, existingSuggestions, "ignored");

    setState((current) => ({
      sessionId: candidate.sessionId,
      locale: candidate.locale,
      suggestions:
        current.sessionId === candidate.sessionId && current.locale === candidate.locale
          ? current.suggestions
          : [],
      claimReadiness:
        current.sessionId === candidate.sessionId && current.locale === candidate.locale
          ? current.claimReadiness
          : null,
      status: "analyzing",
      lastUpdatedAt:
        current.sessionId === candidate.sessionId && current.locale === candidate.locale
          ? current.lastUpdatedAt
          : null,
    }));

    try {
      const recentTranscript = latestTranscriptWindow(candidate.transcript);
      const finalizedSegments = latestFinalSegments(candidate.transcriptSegments);
      const recentSegments = candidate.isProvisional && candidate.provisionalText
        ? [
            ...finalizedSegments.slice(-(recentSegmentLimit - 1)),
            {
              id: `provisional-${requestRevision}`,
              speaker: "unknown" as const,
              text: candidate.provisionalText,
              timestampMs: candidate.elapsedMs,
              isFinal: false,
            },
          ]
        : finalizedSegments;
      const response = await requestGCCLiveInsights({
        locale: candidate.locale,
        sessionId: candidate.sessionId,
        transcriptRevision: requestRevision,
        elapsedMs: candidate.elapsedMs,
        recentTranscript,
        recentSegments,
        patient: candidate.patient,
        existingSuggestions,
        approvedSuggestionIds: approvedExclusions,
        ignoredSuggestionIds: ignoredExclusions,
        sbsMatches: relevantSBSMatches(candidate.sbsMatches, recentTranscript, recentSegments),
        signal: controller.signal,
      });

      if (
        requestSequence < lastCompletedSequenceRef.current ||
        requestSequence !== requestSequenceRef.current ||
        candidate.sessionId !== activeSessionIdRef.current ||
        candidate.locale !== activeLocaleRef.current ||
        response.sessionId !== candidate.sessionId ||
        response.transcriptRevision !== requestRevision
      ) {
        return;
      }

      if (response.transcriptRevision < lastAnalyzedRevisionRef.current) return;
      lastCompletedSequenceRef.current = requestSequence;

      if (response.fallbackReason) {
        const retryableFallback = ["rate_limited", "analysis_in_progress"].includes(response.fallbackReason);
        setState((current) =>
          current.sessionId === candidate.sessionId && current.locale === candidate.locale
            ? {
                ...current,
                status: response.fallbackReason === "rate_limited"
                  ? "retrying"
                  : retryableFallback ? "analyzing" : "unavailable",
              }
            : current,
        );
        if (retryableFallback) {
          const retryDelayMs = Math.max(1, response.retryAfterSeconds ?? 3) * 1_000;
          retryScheduled = true;
          clearDebounceTimer();
          debounceTimerRef.current = window.setTimeout(() => {
            debounceTimerRef.current = null;
            void runRequestRef.current();
          }, retryDelayMs);
        }
        return;
      }

      lastAnalyzedRevisionRef.current = response.transcriptRevision;
      lastAnalyzedTextLengthRef.current = candidate.transcript.length;
      lastAnalyzedWasProvisionalRef.current = candidate.isProvisional;
      lastSuccessfulRequestAtRef.current = Date.now();

      const currentApprovedIds = mergedApprovedIds();
      const currentIgnoredIds = mergedIgnoredIds();
      const nextSuggestions = upsertLiveSuggestions(
        suggestionsRef.current,
        response.suggestions,
        currentApprovedIds,
        currentIgnoredIds,
      );
      suggestionsRef.current = nextSuggestions;
      lastAcceptedTranscriptRef.current = candidate.transcript;
      const updatedAt = Date.now();
      setState((current) => ({
        sessionId: candidate.sessionId,
        locale: candidate.locale,
        suggestions: nextSuggestions,
        claimReadiness: response.claimReadiness ?? (
          current.sessionId === candidate.sessionId && current.locale === candidate.locale
            ? current.claimReadiness
            : null
        ),
        status: "updated",
        lastUpdatedAt: updatedAt,
      }));
    } catch (error) {
      if (isAbortError(error)) {
        if (
          requestSequence === requestSequenceRef.current &&
          candidate.sessionId === activeSessionIdRef.current &&
          candidate.locale === activeLocaleRef.current
        ) {
          setState((current) =>
            current.sessionId === candidate.sessionId &&
            current.locale === candidate.locale &&
            current.status === "analyzing"
              ? { ...current, status: current.lastUpdatedAt ? "updated" : "idle" }
              : current,
          );
        }
        return;
      }
      if (requestSequence !== requestSequenceRef.current) return;
      setState((current) =>
          current.sessionId === candidate.sessionId && current.locale === candidate.locale
            ? { ...current, status: "unavailable" }
            : {
                sessionId: candidate.sessionId,
                locale: candidate.locale,
                suggestions: [],
                claimReadiness: null,
                status: "unavailable",
                lastUpdatedAt: null,
              },
      );
    } finally {
      if (liveInsightsAbortControllerRef.current === controller) {
        liveInsightsAbortControllerRef.current = null;
      }
      liveInsightsInFlightRef.current = false;
      const latest = latestCandidateRef.current;
      if (
        !retryScheduled &&
        latest.sessionId === candidate.sessionId &&
        latest.locale === candidate.locale &&
        latest.isRecording &&
        !latest.isPaused &&
        !latest.isFinalizing &&
        countChangedCharacters(lastAcceptedTranscriptRef.current, latest.transcript) >= minimumChangedCharacters
      ) {
        clearDebounceTimer();
        debounceTimerRef.current = window.setTimeout(() => {
          debounceTimerRef.current = null;
          void runRequestRef.current();
        }, requestDebounceMs);
      }
    }
  }, [clearDebounceTimer, clearScheduledRequests, mergedApprovedIds, mergedIgnoredIds]);

  useEffect(() => {
    runRequestRef.current = runRequest;
  }, [runRequest]);

  useEffect(() => {
    const sessionChanged = activeSessionIdRef.current !== sessionId;
    const localeChanged = activeLocaleRef.current !== locale;

    if (sessionChanged) {
      clearScheduledRequests();
      abortCurrentRequest();
      requestSequenceRef.current += 1;
      activeSessionIdRef.current = sessionId;
      activeLocaleRef.current = locale;
      suggestionsRef.current = [];
      localApprovedIdsRef.current.clear();
      localIgnoredIdsRef.current.clear();
      analysisRevisionRef.current = 0;
      lastCompletedSequenceRef.current = 0;
      lastAnalyzedRevisionRef.current = 0;
      lastAnalyzedTextLengthRef.current = 0;
      lastObservedTranscriptRef.current = "";
      lastObservedFinalRevisionRef.current = 0;
      lastRequestedTranscriptRef.current = "";
      lastAcceptedTranscriptRef.current = "";
      lastRequestedAtRef.current = 0;
      lastSuccessfulRequestAtRef.current = 0;
      lastAnalyzedWasProvisionalRef.current = false;
    } else if (localeChanged) {
      clearScheduledRequests();
      abortCurrentRequest();
      requestSequenceRef.current += 1;
      activeLocaleRef.current = locale;
      suggestionsRef.current = [];
      analysisRevisionRef.current = 0;
      lastCompletedSequenceRef.current = 0;
      lastAnalyzedRevisionRef.current = 0;
      lastAnalyzedTextLengthRef.current = 0;
      lastObservedTranscriptRef.current = "";
      lastObservedFinalRevisionRef.current = 0;
      lastRequestedTranscriptRef.current = "";
      lastAcceptedTranscriptRef.current = "";
      lastRequestedAtRef.current = 0;
      lastSuccessfulRequestAtRef.current = 0;
      lastAnalyzedWasProvisionalRef.current = false;
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

    const replacesProvisional =
      lastAnalyzedWasProvisionalRef.current
      && !stableInterimTranscript
      && transcriptRevision > lastObservedFinalRevisionRef.current;
    if (requestTranscript === lastObservedTranscriptRef.current && !replacesProvisional) return;
    lastObservedTranscriptRef.current = requestTranscript;
    lastObservedFinalRevisionRef.current = transcriptRevision;
    analysisRevisionRef.current = Math.max(
      analysisRevisionRef.current + 1,
      transcriptRevision,
    );

    const changedCharacters = countChangedCharacters(lastRequestedTranscriptRef.current, requestTranscript);
    if (!replacesProvisional && changedCharacters < minimumChangedCharacters) {
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
      const pendingSince = pendingChangeStartedAtRef.current ?? now;
      const forceDelay = Math.max(0, pendingSince + maximumWaitMs - now);
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
    locale,
    requestTranscript,
    runRequest,
    sessionId,
    stableInterimTranscript,
    transcriptRevision,
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

  useEffect(() => {
    const stopLiveInsights = () => {
      latestCandidateRef.current = { ...latestCandidateRef.current, isFinalizing: true };
      clearScheduledRequests();
      abortCurrentRequest();
      requestSequenceRef.current += 1;
    };
    window.addEventListener("medexa:gcc-finalizing", stopLiveInsights);
    return () => window.removeEventListener("medexa:gcc-finalizing", stopLiveInsights);
  }, [abortCurrentRequest, clearScheduledRequests]);

  const approveSuggestion = useCallback(
    (fingerprint: string) => {
      const normalizedFingerprint = fingerprint.trim();
      if (
        !normalizedFingerprint ||
        activeSessionIdRef.current !== sessionId ||
        activeLocaleRef.current !== locale
      ) return;
      localApprovedIdsRef.current.add(normalizedFingerprint);
      localIgnoredIdsRef.current.delete(normalizedFingerprint);
      suggestionsRef.current = suggestionsRef.current.map((suggestion) =>
        suggestion.fingerprint === normalizedFingerprint ? { ...suggestion, status: "approved" } : suggestion,
      );
      setState((current) =>
        current.sessionId === sessionId && current.locale === locale
          ? {
              ...current,
              suggestions: suggestionsRef.current,
              claimReadiness: current.claimReadiness
                ? readinessFromActiveSuggestions(suggestionsRef.current, locale)
                : null,
            }
          : current,
      );
    },
    [locale, sessionId],
  );

  const ignoreSuggestion = useCallback(
    (fingerprint: string) => {
      const normalizedFingerprint = fingerprint.trim();
      if (
        !normalizedFingerprint ||
        activeSessionIdRef.current !== sessionId ||
        activeLocaleRef.current !== locale
      ) return;
      localIgnoredIdsRef.current.add(normalizedFingerprint);
      localApprovedIdsRef.current.delete(normalizedFingerprint);
      suggestionsRef.current = suggestionsRef.current.map((suggestion) =>
        suggestion.fingerprint === normalizedFingerprint ? { ...suggestion, status: "ignored" } : suggestion,
      );
      setState((current) =>
        current.sessionId === sessionId && current.locale === locale
          ? {
              ...current,
              suggestions: suggestionsRef.current,
              claimReadiness: current.claimReadiness
                ? readinessFromActiveSuggestions(suggestionsRef.current, locale)
                : null,
            }
          : current,
      );
    },
    [locale, sessionId],
  );

  const isCurrentSession = state.sessionId === sessionId && state.locale === locale;
  const suggestions = useMemo(
    () =>
      withLiveSuggestionStatuses(
        isCurrentSession ? state.suggestions : [],
        externalApprovedIds,
        externalIgnoredIds,
      ),
    [externalApprovedIds, externalIgnoredIds, isCurrentSession, state.suggestions],
  );
  const activeSuggestions = useMemo(
    () => activeLiveSuggestions(suggestions),
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
