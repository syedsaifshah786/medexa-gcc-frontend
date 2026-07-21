"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import {
  buildFinalTranscript,
  detectAmbientVoiceCommand,
  detectSessionVoiceCommand,
  normalizeTranscript,
  normalizeVoiceCommandText,
  removeVoiceCommands,
} from "@/lib/gcc/transcript-utils";
import { buildReviewBundleFromFinalizeResponse, cacheReviewBundleBeforeNavigation, finalizeGCCSession, GCCFinalizeError, saveSoapLocally } from "@/lib/gcc/session-api";
import { useGCCReviewContext } from "@/providers/GCCReviewProvider";
import type { SBSMatch } from "@/types/sbs-v3";

export type SessionStatus = "idle" | "command-listening" | "starting" | "recording" | "paused" | "stopping" | "stopped" | "error";
export type PermissionState = "unknown" | "prompt" | "granted" | "denied";
export type RecognitionMode = "off" | "ambient-command" | "session-transcription" | "paused-command-only";
export type SessionSource = "voice" | "manual" | "restored";
export type SessionInputMode = "web-speech";

export type TranscriptSegment = {
  id: string;
  text: string;
  timestampMs: number;
  isFinal: boolean;
  confidence?: number;
  speaker?: "clinician" | "patient" | "unknown";
  speakerLabel?: string;
  source?: "web-speech";
};

export type GCCSessionPatient = {
  name: string;
  age: number | null;
  gender: string;
};

type PersistedVoiceSession = {
  sessionId: string | null;
  status: SessionStatus;
  finalTranscript: string;
  transcriptSegments: TranscriptSegment[];
  transcriptRevision?: number;
  elapsedMs: number;
  source?: SessionSource;
  inputMode?: SessionInputMode;
  startedAt?: number | null;
  patient?: GCCSessionPatient;
};

export type StartSessionOptions = {
  source?: SessionSource;
  sessionId?: string;
  preserveTranscript?: boolean;
  patient?: GCCSessionPatient;
  inputMode?: SessionInputMode;
};

type GCCVoiceSessionContextValue = {
  sessionId: string | null;
  status: SessionStatus;
  permissionStatus: PermissionState;
  isRecognitionActive: boolean;
  isSessionActive: boolean;
  finalTranscript: string;
  interimTranscript: string;
  transcriptSegments: TranscriptSegment[];
  transcriptRevision: number;
  latestHeardText: string;
  elapsedMs: number;
  startedAt: number | null;
  errorMessage: string | null;
  lastCommand: string | null;
  enableVoiceControl: () => Promise<boolean>;
  startAmbientCommandListening: () => Promise<boolean>;
  startSession: (options?: StartSessionOptions) => Promise<string | null>;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => Promise<void>;
  setSBSMatches: (matches: readonly SBSMatch[]) => void;
  restartRecognition: () => void;
  clearSession: () => void;
  formatElapsedTime: (value?: number) => string;
  handleVoiceCommand: (text: string) => boolean;
  navigateToSessionFromVoice: () => Promise<void>;
  finalizeAndNavigateToSoap: () => Promise<void>;
  finalizationMessage: string | null;
  finalizationError: string | null;
  retryFinalize: () => Promise<void>;
  setSessionPatient: (patient: GCCSessionPatient) => void;
};

const storageKey = "medexa_gcc_voice_session";
const commandCooldownMs = 2200;
const reviewRoutes = new Set(["/soap-notes", "/billing-intelligence", "/patient-summary"]);
const GCCVoiceSessionContext = createContext<GCCVoiceSessionContextValue | null>(null);
const speechLanguages = { en: "en-US", ar: "ar-SA" } as const;

const getSpeechRecognitionConstructor = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
};

const generateSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `gcc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const getBestAlternative = (result: SpeechRecognitionResult) => {
  let best = result[0];

  for (let index = 1; index < result.length; index += 1) {
    const candidate = result[index];
    if ((candidate.confidence ?? 0) > (best.confidence ?? 0)) {
      best = candidate;
    }
  }

  return best;
};

export function GCCVoiceSessionProvider({ children }: { children: ReactNode }) {
  const { setReviewBundle } = useGCCReviewContext();
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t, formatDuration } = useGCCLocale();
  const speechLanguage = speechLanguages[locale];
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionActiveRef = useRef(false);
  const speechLanguageRef = useRef(speechLanguage);
  const languageTransitionRef = useRef(0);
  const shouldRecognitionRunRef = useRef(false);
  const recognitionStartingRef = useRef(false);
  const manualStopRef = useRef(false);
  const modeRef = useRef<RecognitionMode>("off");
  const statusRef = useRef<SessionStatus>("idle");
  const sessionIdRef = useRef<string | null>(null);
  const sessionPatientRef = useRef<GCCSessionPatient | null>(null);
  const sessionInputModeRef = useRef<SessionInputMode>("web-speech");
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const commandCooldownRef = useRef(0);
  const lastProcessedCommandRef = useRef("");
  const restartTimeoutRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const isFinalizingRef = useRef(false);
  const finalizeRetryAfterUntilRef = useRef(0);
  const stoppedRef = useRef(false);
  const startNavigationInProgressRef = useRef(false);
  const mountedRef = useRef(false);
  const permissionStatusRef = useRef<PermissionState>("unknown");
  const networkRetryRef = useRef(0);
  const lastFinalTextRef = useRef("");
  const latestHeardTextRef = useRef("");
  const transcriptSegmentsRef = useRef<TranscriptSegment[]>([]);
  const transcriptRevisionRef = useRef(0);
  const processedSegmentIdsRef = useRef(new Set<string>());
  const recognitionCycleRef = useRef(0);
  const sbsMatchesRef = useRef<SBSMatch[]>([]);
  const recognitionEndWaitersRef = useRef<Array<() => void>>([]);
  const processRecognitionResultRef = useRef<(event: SpeechRecognitionEvent) => void>(() => undefined);
  const restartRecognitionRef = useRef<() => void>(() => undefined);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>("unknown");
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [transcriptRevision, setTranscriptRevision] = useState(0);
  const [latestHeardText, setLatestHeardText] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [errorMessageKey, setErrorMessage] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [finalizationMessageKey, setFinalizationMessage] = useState<string | null>(null);
  const [finalizationErrorKey, setFinalizationError] = useState<string | null>(null);
  const errorMessage = errorMessageKey ? t(errorMessageKey) : null;
  const finalizationMessage = finalizationMessageKey ? t(finalizationMessageKey) : null;
  const finalizationError = finalizationErrorKey
    ? finalizationErrorKey.startsWith("session.") ? t(finalizationErrorKey) : finalizationErrorKey
    : null;

  const setSafeStatus = useCallback((nextStatus: SessionStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const persistSession = useCallback((override?: Partial<PersistedVoiceSession>) => {
    if (typeof window === "undefined") return;
    const payload: PersistedVoiceSession = {
      sessionId: sessionIdRef.current,
      status: statusRef.current,
      finalTranscript: finalTranscriptRef.current,
      transcriptSegments: transcriptSegmentsRef.current,
      transcriptRevision: transcriptRevisionRef.current,
      elapsedMs: accumulatedMsRef.current + (sessionStartedAtRef.current ? performance.now() - sessionStartedAtRef.current : 0),
      startedAt: sessionStartedAtRef.current,
      patient: sessionPatientRef.current ?? undefined,
      inputMode: sessionInputModeRef.current,
      ...override,
    };
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  }, []);

  const setSessionPatient = useCallback((patient: GCCSessionPatient) => {
    sessionPatientRef.current = patient;
    persistSession({ patient });
  }, [persistSession]);

  const saveRecoveryDraft = useCallback((payload: { sessionId: string; transcript: string; elapsedMs: number; status: "finalizing" | "failed" }) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      `medexa_gcc_session_${payload.sessionId}`,
      JSON.stringify({
        sessionId: payload.sessionId,
        transcript: payload.transcript,
        transcriptSegments: transcriptSegmentsRef.current,
        patient: sessionPatientRef.current,
        sbsMatches: sbsMatchesRef.current,
        elapsedMs: payload.elapsedMs,
        status: payload.status,
        savedAt: new Date().toISOString(),
      }),
    );
  }, []);

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const stopTimerInterval = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const calculateElapsed = useCallback(() => accumulatedMsRef.current + (sessionStartedAtRef.current ? performance.now() - sessionStartedAtRef.current : 0), []);

  const startTimerInterval = useCallback(() => {
    stopTimerInterval();
    timerIntervalRef.current = window.setInterval(() => {
      if (!mountedRef.current) return;
      setElapsedMs(calculateElapsed());
    }, 250);
  }, [calculateElapsed, stopTimerInterval]);

  const safeStopRecognition = useCallback((method: "stop" | "abort" = "stop") => {
    manualStopRef.current = true;
    shouldRecognitionRunRef.current = false;
    clearRestartTimeout();
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition[method]();
    } catch {
      // Some browser implementations throw if recognition is not running.
    }
  }, [clearRestartTimeout]);

  const waitForRecognitionEnd = useCallback(() => {
    if (
      !recognitionRef.current ||
      (!recognitionActiveRef.current && !recognitionStartingRef.current)
    ) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      recognitionEndWaitersRef.current.push(finish);
      window.setTimeout(finish, 1500);
    });
  }, []);

  const startRecognition = useCallback((mode: RecognitionMode) => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setErrorMessage("session.voice.unsupported");
      setSafeStatus("error");
      return false;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = speechLanguageRef.current;
      recognition.onstart = () => {
        recognitionStartingRef.current = false;
        recognitionActiveRef.current = true;
        networkRetryRef.current = 0;
        setIsRecognitionActive(true);
        setErrorMessage(null);
      };
      recognition.onresult = (event) => {
        processRecognitionResultRef.current(event);
      };
      recognition.onerror = (event) => {
        recognitionStartingRef.current = false;
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          permissionStatusRef.current = "denied";
          setPermissionStatus("denied");
          setErrorMessage("session.voice.microphoneRequired");
          safeStopRecognition("abort");
          return;
        }

        if (event.error === "network") {
          networkRetryRef.current = Math.min(networkRetryRef.current + 1, 4);
          setErrorMessage("session.voice.networkInterrupted");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          setErrorMessage("session.voice.interrupted");
        }
      };
      recognition.onend = () => {
        recognitionStartingRef.current = false;
        recognitionActiveRef.current = false;
        setIsRecognitionActive(false);
        const waiters = recognitionEndWaitersRef.current;
        recognitionEndWaitersRef.current = [];
        waiters.forEach((resolve) => resolve());
        if (shouldRecognitionRunRef.current && !manualStopRef.current && permissionStatusRef.current !== "denied" && modeRef.current !== "off") {
          restartRecognitionRef.current();
        }
      };
      recognitionRef.current = recognition;
    }

    recognitionRef.current.lang = speechLanguageRef.current;

    modeRef.current = mode;
    shouldRecognitionRunRef.current = true;
    manualStopRef.current = false;

    if (recognitionStartingRef.current || recognitionActiveRef.current) {
      return true;
    }

    try {
      recognitionStartingRef.current = true;
      recognitionCycleRef.current += 1;
      recognitionRef.current.start();
      return true;
    } catch (error) {
      recognitionStartingRef.current = false;
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        return true;
      }
      setErrorMessage("session.voice.startFailed");
      return false;
    }
  }, [safeStopRecognition, setSafeStatus]);

  const requestMicrophonePermission = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      permissionStatusRef.current = "granted";
      setPermissionStatus("granted");
      setErrorMessage(null);
      return true;
    } catch {
      permissionStatusRef.current = "denied";
      setPermissionStatus("denied");
      setErrorMessage("session.voice.microphoneRequired");
      return false;
    }
  }, []);

  const enableVoiceControl = useCallback(async () => {
    if (!getSpeechRecognitionConstructor()) {
      setErrorMessage("session.voice.unsupported");
      setSafeStatus("error");
      return false;
    }

    if (permissionStatusRef.current === "granted") {
      return true;
    }

    return requestMicrophonePermission();
  }, [requestMicrophonePermission, setSafeStatus]);

  const restartRecognition = useCallback(() => {
    clearRestartTimeout();
    if (!shouldRecognitionRunRef.current || manualStopRef.current || permissionStatusRef.current === "denied" || modeRef.current === "off") {
      return;
    }

    restartTimeoutRef.current = window.setTimeout(() => {
      recognitionStartingRef.current = false;
      startRecognition(modeRef.current);
    }, 350 + networkRetryRef.current * 250);
  }, [clearRestartTimeout, startRecognition]);

  useEffect(() => {
    speechLanguageRef.current = speechLanguage;
    const recognition = recognitionRef.current;
    if (!recognition || recognition.lang === speechLanguage) return;

    const transition = languageTransitionRef.current + 1;
    languageTransitionRef.current = transition;
    const modeBeforeSwitch = modeRef.current;
    const shouldRestart =
      shouldRecognitionRunRef.current &&
      modeBeforeSwitch !== "off" &&
      permissionStatusRef.current !== "denied" &&
      !isFinalizingRef.current &&
      !stoppedRef.current;

    clearRestartTimeout();
    shouldRecognitionRunRef.current = false;
    manualStopRef.current = true;
    interimTranscriptRef.current = "";
    setInterimTranscript("");

    const applyLanguageAndRestart = () => {
      if (!mountedRef.current || transition !== languageTransitionRef.current) return;
      recognition.lang = speechLanguage;
      if (
        shouldRestart &&
        modeRef.current === modeBeforeSwitch &&
        !isFinalizingRef.current &&
        !stoppedRef.current
      ) {
        startRecognition(modeBeforeSwitch);
      }
    };

    if (!recognitionActiveRef.current && !recognitionStartingRef.current) {
      applyLanguageAndRestart();
      return;
    }

    try {
      recognition.stop();
    } catch {
      // The recognizer may finish between the active-state check and stop().
    }

    void waitForRecognitionEnd().then(applyLanguageAndRestart);
  }, [clearRestartTimeout, speechLanguage, startRecognition, waitForRecognitionEnd]);

  const appendFinalTranscript = useCallback((text: string, confidence?: number, resultId?: string) => {
    const cleanText = normalizeTranscript(text);
    const stableResultId = resultId?.trim();
    if (
      !cleanText ||
      (stableResultId && processedSegmentIdsRef.current.has(stableResultId)) ||
      cleanText === lastFinalTextRef.current
    ) return;

    if (stableResultId) processedSegmentIdsRef.current.add(stableResultId);
    lastFinalTextRef.current = cleanText;
    const segment: TranscriptSegment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: cleanText,
      timestampMs: calculateElapsed(),
      isFinal: true,
      confidence,
      source: "web-speech",
    };
    const nextSegments = [...transcriptSegmentsRef.current, segment];
    transcriptSegmentsRef.current = nextSegments;
    setTranscriptSegments(nextSegments);
    finalTranscriptRef.current = [finalTranscriptRef.current, cleanText].filter(Boolean).join(" ");
    transcriptRevisionRef.current += 1;
    setFinalTranscript(finalTranscriptRef.current);
    setTranscriptRevision(transcriptRevisionRef.current);
    interimTranscriptRef.current = "";
    setInterimTranscript("");
    persistSession({ transcriptSegments: nextSegments, finalTranscript: finalTranscriptRef.current });
  }, [calculateElapsed, persistSession]);

  const setSBSMatches = useCallback((matches: readonly SBSMatch[]) => {
    sbsMatchesRef.current = [...matches];
  }, []);

  const flushRecognitionBeforeFinalize = useCallback(async () => {
    manualStopRef.current = true;
    shouldRecognitionRunRef.current = false;
    clearRestartTimeout();
    try {
      recognitionRef.current?.stop();
    } catch {
      // Recognition may already be stopped; continue with refs.
    }

    await waitForRecognitionEnd();

    const interim = removeVoiceCommands(interimTranscriptRef.current);
    const existingTranscript = buildFinalTranscript({
      finalTranscript: finalTranscriptRef.current,
      transcriptSegments: transcriptSegmentsRef.current,
      interimTranscript: "",
      latestHeardText: latestHeardTextRef.current,
    });

    if (interim && !existingTranscript.toLowerCase().includes(interim.toLowerCase())) {
      appendFinalTranscript(interim);
    }

    interimTranscriptRef.current = "";
    setInterimTranscript("");
  }, [appendFinalTranscript, clearRestartTimeout, waitForRecognitionEnd]);

  const finalizeAndNavigateToSoap = useCallback(async () => {
    if (isFinalizingRef.current) return;
    if (stoppedRef.current) return;
    isFinalizingRef.current = true;
    stoppedRef.current = true;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("medexa:gcc-finalizing"));
    }
    setSafeStatus("stopping");
    setFinalizationMessage("session.finalize.inProgress");
    setFinalizationError(null);
    const id = sessionIdRef.current ?? generateSessionId();
    sessionIdRef.current = id;
    setSessionId(id);

    try {
      await flushRecognitionBeforeFinalize();
      const frozenElapsed = calculateElapsed();
      accumulatedMsRef.current = frozenElapsed;
      sessionStartedAtRef.current = null;
      setElapsedMs(frozenElapsed);
      setStartedAt(null);
      stopTimerInterval();
      modeRef.current = "off";
      const transcript = buildFinalTranscript({
        finalTranscript: finalTranscriptRef.current,
        transcriptSegments: transcriptSegmentsRef.current,
        interimTranscript: interimTranscriptRef.current,
        latestHeardText: latestHeardTextRef.current,
      });

      if (!transcript) {
        throw new Error("NO_TRANSCRIPT");
      }

      saveRecoveryDraft({ sessionId: id, transcript, elapsedMs: frozenElapsed, status: "finalizing" });
      const response = await finalizeGCCSession({
        sessionId: id,
        transcript,
        transcriptSegments: transcriptSegmentsRef.current,
        elapsedMs: frozenElapsed,
        locale,
        patient: sessionPatientRef.current ?? undefined,
        sbsMatches: sbsMatchesRef.current,
      });

      if (response.savedToStore !== true || response.sessionId !== id) {
        throw new Error("FINALIZE_INCOMPLETE");
      }

      const reviewBundle = buildReviewBundleFromFinalizeResponse(response);
      if (!cacheReviewBundleBeforeNavigation(reviewBundle, locale, (bundle) => setReviewBundle(bundle, "finalize"))) {
        throw new Error("FINALIZE_CACHE_FAILED");
      }
      saveSoapLocally({
        sessionId: id,
        soapNote: reviewBundle.soapNote,
        elapsedMs: frozenElapsed,
        transcript,
        llmUsed: response.llmUsed,
        fallbackReason: response.fallbackReason,
        locale,
      });
      setSafeStatus("stopped");
      persistSession({ status: "stopped", elapsedMs: frozenElapsed });
      setFinalizationMessage(null);
      finalizeRetryAfterUntilRef.current = 0;
      router.replace(`/soap-notes?sessionId=${encodeURIComponent(id)}`);
    } catch (error) {
      const messageKey =
        error instanceof Error && error.message === "NO_TRANSCRIPT"
          ? "session.finalize.noTranscript"
          : error instanceof GCCFinalizeError
            ? error.message
          : "session.finalize.failedSaved";
      if (error instanceof GCCFinalizeError && error.retryable) {
        finalizeRetryAfterUntilRef.current = Date.now() + (error.retryAfterSeconds ?? 0) * 1_000;
      }
      const failedElapsed = calculateElapsed();
      const transcript = buildFinalTranscript({
        finalTranscript: finalTranscriptRef.current,
        transcriptSegments: transcriptSegmentsRef.current,
        interimTranscript: interimTranscriptRef.current,
        latestHeardText: latestHeardTextRef.current,
      });
      saveRecoveryDraft({ sessionId: id, transcript, elapsedMs: failedElapsed, status: "failed" });
      accumulatedMsRef.current = failedElapsed;
      sessionStartedAtRef.current = null;
      setElapsedMs(failedElapsed);
      stopTimerInterval();
      setSafeStatus("stopped");
      setFinalizationMessage(null);
      setFinalizationError(messageKey);
      persistSession({ status: "stopped", elapsedMs: failedElapsed });
      isFinalizingRef.current = false;
      stoppedRef.current = false;
    }
  }, [
    calculateElapsed,
    flushRecognitionBeforeFinalize,
    locale,
    persistSession,
    router,
    saveRecoveryDraft,
    setReviewBundle,
    setSafeStatus,
    stopTimerInterval,
  ]);

  const pauseSession = useCallback(() => {
    if (statusRef.current !== "recording") return;
    const frozenElapsed = calculateElapsed();
    accumulatedMsRef.current = frozenElapsed;
    sessionStartedAtRef.current = null;
    pausedAtRef.current = performance.now();
    setElapsedMs(frozenElapsed);
    setStartedAt(null);
    stopTimerInterval();
    interimTranscriptRef.current = "";
    setInterimTranscript("");
    setSafeStatus("paused");
    modeRef.current = "off";
    safeStopRecognition("stop");
    persistSession({ status: "paused", elapsedMs: frozenElapsed });
  }, [calculateElapsed, persistSession, safeStopRecognition, setSafeStatus, stopTimerInterval]);

  const resumeSession = useCallback(() => {
    if (statusRef.current === "recording") return;
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
      setSessionId(sessionIdRef.current);
    }
    sessionStartedAtRef.current = performance.now();
    pausedAtRef.current = null;
    setStartedAt(Date.now());
    setSafeStatus("recording");
    startTimerInterval();
    startRecognition("session-transcription");
    persistSession({ status: "recording" });
  }, [persistSession, setSafeStatus, startRecognition, startTimerInterval]);

  const clearSession = useCallback(() => {
    safeStopRecognition("abort");
    stopTimerInterval();
    modeRef.current = "off";
    shouldRecognitionRunRef.current = false;
    sessionIdRef.current = null;
    sessionPatientRef.current = null;
    sessionInputModeRef.current = "web-speech";
    setSessionId(null);
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    transcriptSegmentsRef.current = [];
    transcriptRevisionRef.current = 0;
    processedSegmentIdsRef.current.clear();
    sbsMatchesRef.current = [];
    lastFinalTextRef.current = "";
    accumulatedMsRef.current = 0;
    sessionStartedAtRef.current = null;
    pausedAtRef.current = null;
    isFinalizingRef.current = false;
    finalizeRetryAfterUntilRef.current = 0;
    stoppedRef.current = false;
    startNavigationInProgressRef.current = false;
    setFinalizationMessage(null);
    setFinalizationError(null);
    setFinalTranscript("");
    setInterimTranscript("");
    setTranscriptSegments([]);
    setTranscriptRevision(0);
    setLatestHeardText("");
    setElapsedMs(0);
    setStartedAt(null);
    setLastCommand(null);
    setErrorMessage(null);
    setSafeStatus("idle");
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [safeStopRecognition, setSafeStatus, stopTimerInterval]);

  const startSession = useCallback(async (options?: StartSessionOptions) => {
    const inputMode: SessionInputMode = "web-speech";
    if (!(await enableVoiceControl())) {
      return null;
    }

    const id = options?.sessionId ?? generateSessionId();
    isFinalizingRef.current = false;
    finalizeRetryAfterUntilRef.current = 0;
    stoppedRef.current = false;
    sessionIdRef.current = id;
    sessionInputModeRef.current = inputMode;
    if (options?.patient) {
      sessionPatientRef.current = options.patient;
    }
    setSessionId(id);
    if (!options?.preserveTranscript) {
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      transcriptSegmentsRef.current = [];
      transcriptRevisionRef.current = 0;
      processedSegmentIdsRef.current.clear();
      sbsMatchesRef.current = [];
      lastFinalTextRef.current = "";
      setFinalTranscript("");
      setInterimTranscript("");
      setTranscriptSegments([]);
      setTranscriptRevision(0);
      accumulatedMsRef.current = 0;
      setElapsedMs(0);
    }
    sessionStartedAtRef.current = performance.now();
    pausedAtRef.current = null;
    setStartedAt(Date.now());
    setSafeStatus("recording");
    startTimerInterval();
    startRecognition("session-transcription");
    persistSession({
      sessionId: id,
      status: "recording",
      source: options?.source ?? "manual",
      inputMode,
      patient: sessionPatientRef.current ?? undefined,
    });
    return id;
  }, [enableVoiceControl, persistSession, setSafeStatus, startRecognition, startTimerInterval]);

  const navigateToSessionFromVoice = useCallback(async () => {
    if (startNavigationInProgressRef.current) return;
    startNavigationInProgressRef.current = true;
    const id = await startSession({ source: "voice" });
    if (!id) {
      startNavigationInProgressRef.current = false;
      return;
    }
    router.push(`/session?sessionId=${encodeURIComponent(id)}&autoStart=1&source=voice`);
  }, [router, startSession]);

  const stopSession = useCallback(async () => {
    await finalizeAndNavigateToSoap();
  }, [finalizeAndNavigateToSoap]);

  const handleVoiceCommand = useCallback((rawText: string) => {
    const normalized = normalizeVoiceCommandText(rawText);
    if (!normalized) return false;

    const now = Date.now();
    if (now - commandCooldownRef.current < commandCooldownMs && normalized === lastProcessedCommandRef.current) {
      return true;
    }

    const markCommand = (command: string) => {
      commandCooldownRef.current = now;
      lastProcessedCommandRef.current = normalized;
      setLastCommand(command);
    };

    const command =
      modeRef.current === "ambient-command"
        ? detectAmbientVoiceCommand(normalized)
        : modeRef.current === "session-transcription" || modeRef.current === "paused-command-only"
          ? detectSessionVoiceCommand(normalized)
          : null;

    if (command === "start-session") {
      markCommand(command);
      void navigateToSessionFromVoice();
      return true;
    }

    if (command === "stop-recording") {
      markCommand(command);
      void finalizeAndNavigateToSoap();
      return true;
    }

    if (command === "pause-recording") {
      markCommand(command);
      pauseSession();
      return true;
    }

    if (command === "resume-recording") {
      markCommand(command);
      resumeSession();
      return true;
    }

    return false;
  }, [finalizeAndNavigateToSoap, navigateToSessionFromVoice, pauseSession, resumeSession]);

  const processRecognitionResult = useCallback((event: SpeechRecognitionEvent) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const alternative = getBestAlternative(result);
      const text = alternative.transcript.trim();
      if (!text) continue;

      latestHeardTextRef.current = text;
      setLatestHeardText(text);
      const isCommand = handleVoiceCommand(text);
      if (isCommand) {
        if (result.isFinal) {
          interimTranscriptRef.current = "";
          setInterimTranscript("");
        }
        continue;
      }

      if (modeRef.current !== "session-transcription" || (statusRef.current !== "recording" && statusRef.current !== "stopping")) {
        continue;
      }

      if (result.isFinal) {
        appendFinalTranscript(
          text,
          alternative.confidence,
          `${recognitionCycleRef.current}:${index}`,
        );
      } else {
        interimTranscriptRef.current = text;
        setInterimTranscript(text);
      }
    }
  }, [appendFinalTranscript, handleVoiceCommand]);

  useEffect(() => {
    processRecognitionResultRef.current = processRecognitionResult;
  }, [processRecognitionResult]);

  useEffect(() => {
    restartRecognitionRef.current = restartRecognition;
  }, [restartRecognition]);

  const startAmbientCommandListening = useCallback(async () => {
    if (reviewRoutes.has(pathname)) return false;
    if (!(await enableVoiceControl())) return false;
    const didStart = startRecognition("ambient-command");
    if (didStart) {
      setSafeStatus("command-listening");
    }
    return didStart;
  }, [enableVoiceControl, pathname, setSafeStatus, startRecognition]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    permissionStatusRef.current = permissionStatus;
  }, [permissionStatus]);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    // Restore browser storage after the effect has subscribed. Deferring the
    // update keeps hydration deterministic while still restoring in the same
    // task turn, before the clinician can meaningfully interact with controls.
    void Promise.resolve().then(() => {
      if (cancelled || typeof window === "undefined") return;
      if (statusRef.current === "recording" && sessionIdRef.current) return;
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PersistedVoiceSession;
          sessionIdRef.current = parsed.sessionId;
          sessionPatientRef.current = parsed.patient ?? null;
          sessionInputModeRef.current = parsed.inputMode ?? "web-speech";
          finalTranscriptRef.current = parsed.finalTranscript ?? "";
          transcriptSegmentsRef.current = parsed.transcriptSegments ?? [];
          lastFinalTextRef.current = transcriptSegmentsRef.current.at(-1)?.text ?? "";
          transcriptRevisionRef.current =
            parsed.transcriptRevision ?? transcriptSegmentsRef.current.filter((segment) => segment.isFinal).length;
          accumulatedMsRef.current = parsed.elapsedMs ?? 0;
          setSessionId(parsed.sessionId);
          setFinalTranscript(parsed.finalTranscript ?? "");
          setTranscriptSegments(parsed.transcriptSegments ?? []);
          setTranscriptRevision(transcriptRevisionRef.current);
          setElapsedMs(parsed.elapsedMs ?? 0);
          setSafeStatus(parsed.status === "recording" ? "idle" : parsed.status);
        } catch {
          window.sessionStorage.removeItem(storageKey);
        }
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      languageTransitionRef.current += 1;
      recognitionActiveRef.current = false;
      stopTimerInterval();
      clearRestartTimeout();
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onstart = null;
      }
      safeStopRecognition("abort");
    };
  }, [clearRestartTimeout, safeStopRecognition, setSafeStatus, stopTimerInterval]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      permissionStatusRef.current = "unknown";
      return;
    }

    let permissionStatusObject: PermissionStatus | null = null;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        permissionStatusObject = result;
        const next = result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "prompt";
        permissionStatusRef.current = next;
        setPermissionStatus(next);
        result.onchange = () => {
          const changed = result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "prompt";
          permissionStatusRef.current = changed;
          setPermissionStatus(changed);
        };
      })
      .catch(() => {
        permissionStatusRef.current = "unknown";
        setPermissionStatus("unknown");
      });

    return () => {
      if (permissionStatusObject) {
        permissionStatusObject.onchange = null;
      }
    };
  }, []);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onstart = () => {
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = true;
      networkRetryRef.current = 0;
      setIsRecognitionActive(true);
      setErrorMessage(null);
    };
    recognition.onresult = processRecognitionResult;
    recognition.onerror = (event) => {
      recognitionStartingRef.current = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        permissionStatusRef.current = "denied";
        setPermissionStatus("denied");
        setErrorMessage("session.voice.microphoneRequired");
        safeStopRecognition("abort");
        return;
      }

      if (event.error === "network") {
        networkRetryRef.current = Math.min(networkRetryRef.current + 1, 4);
        setErrorMessage("session.voice.networkInterrupted");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setErrorMessage("session.voice.interrupted");
      }
    };
    recognition.onend = () => {
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      setIsRecognitionActive(false);
      const waiters = recognitionEndWaitersRef.current;
      recognitionEndWaitersRef.current = [];
      waiters.forEach((resolve) => resolve());
      if (shouldRecognitionRunRef.current && !manualStopRef.current && permissionStatusRef.current !== "denied" && modeRef.current !== "off") {
        restartRecognition();
      }
    };
  }, [processRecognitionResult, restartRecognition, safeStopRecognition]);

  useEffect(() => {
    if (reviewRoutes.has(pathname)) {
      safeStopRecognition("stop");
      modeRef.current = "off";
      return;
    }

    startNavigationInProgressRef.current = false;
  }, [pathname, safeStopRecognition]);

  const retryFinalize = useCallback(async () => {
    isFinalizingRef.current = false;
    stoppedRef.current = false;
    const delayMs = Math.max(0, finalizeRetryAfterUntilRef.current - Date.now());
    if (delayMs > 0) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));
    }
    await finalizeAndNavigateToSoap();
  }, [finalizeAndNavigateToSoap]);

  const value = useMemo<GCCVoiceSessionContextValue>(
    () => ({
      sessionId,
      status,
      permissionStatus,
      isRecognitionActive,
      isSessionActive: status === "recording" || status === "paused",
      finalTranscript,
      interimTranscript,
      transcriptSegments,
      transcriptRevision,
      latestHeardText,
      elapsedMs,
      startedAt,
      errorMessage,
      lastCommand,
      enableVoiceControl,
      startAmbientCommandListening,
      startSession,
      pauseSession,
      resumeSession,
      stopSession,
      setSBSMatches,
      restartRecognition,
      clearSession,
      formatElapsedTime: (valueToFormat = elapsedMs) => formatDuration(valueToFormat),
      handleVoiceCommand,
      navigateToSessionFromVoice,
      finalizeAndNavigateToSoap,
      finalizationMessage,
      finalizationError,
      retryFinalize,
      setSessionPatient,
    }),
    [
      setSBSMatches,
      clearSession,
      elapsedMs,
      enableVoiceControl,
      errorMessage,
      finalTranscript,
      formatDuration,
      finalizeAndNavigateToSoap,
      finalizationError,
      finalizationMessage,
      handleVoiceCommand,
      interimTranscript,
      isRecognitionActive,
      lastCommand,
      latestHeardText,
      navigateToSessionFromVoice,
      pauseSession,
      permissionStatus,
      restartRecognition,
      retryFinalize,
      setSessionPatient,
      resumeSession,
      sessionId,
      startAmbientCommandListening,
      startSession,
      startedAt,
      status,
      stopSession,
      transcriptSegments,
      transcriptRevision,
    ],
  );

  return <GCCVoiceSessionContext.Provider value={value}>{children}</GCCVoiceSessionContext.Provider>;
}

export function useGCCVoiceSessionContext() {
  const context = useContext(GCCVoiceSessionContext);
  if (!context) {
    throw new Error("useGCCVoiceSession must be used within GCCVoiceSessionProvider");
  }
  return context;
}
