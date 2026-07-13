"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { buildFinalTranscript, removeVoiceCommands } from "@/lib/gcc/transcript-utils";
import { buildReviewBundleFromFinalizeResponse, finalizeGCCSession, saveReviewBundleLocally, saveSoapLocally } from "@/lib/gcc/session-api";

export type SessionStatus = "idle" | "command-listening" | "starting" | "recording" | "paused" | "stopping" | "stopped" | "error";
export type PermissionState = "unknown" | "prompt" | "granted" | "denied";
export type RecognitionMode = "off" | "ambient-command" | "session-transcription" | "paused-command-only";
export type SessionSource = "voice" | "manual" | "restored";

export type TranscriptSegment = {
  id: string;
  text: string;
  timestampMs: number;
  isFinal: boolean;
  confidence?: number;
};

type PersistedVoiceSession = {
  sessionId: string | null;
  status: SessionStatus;
  finalTranscript: string;
  transcriptSegments: TranscriptSegment[];
  elapsedMs: number;
  source?: SessionSource;
  startedAt?: number | null;
};

export type StartSessionOptions = {
  source?: SessionSource;
  sessionId?: string;
  preserveTranscript?: boolean;
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
  restartRecognition: () => void;
  clearSession: () => void;
  formatElapsedTime: (value?: number) => string;
  handleVoiceCommand: (text: string) => boolean;
  navigateToSessionFromVoice: () => Promise<void>;
  finalizeAndNavigateToSoap: () => Promise<void>;
  finalizationMessage: string | null;
  finalizationError: string | null;
  retryFinalize: () => Promise<void>;
};

const storageKey = "medexa_gcc_voice_session";
const unsupportedMessage = "Live voice recognition is not supported in this browser. Please use Chrome or Edge.";
const commandCooldownMs = 2200;
const reviewRoutes = new Set(["/soap-notes", "/billing-intelligence", "/patient-summary"]);
const GCCVoiceSessionContext = createContext<GCCVoiceSessionContextValue | null>(null);

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

const normalizeCommandText = (text: string) =>
  text
    .toLowerCase()
    .replace(/\b(madexa|med exa|med extra|mede?xa)\b/g, "medexa")
    .replace(/\b(hi|hey|okay|ok)\s+madexa\b/g, "hey medexa")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasMedexaPrefix = (text: string) => /\b(hey\s+)?medexa\b/.test(text);

const commandPatterns = {
  startSession: [
    /\b(hey\s+)?medexa\s+start\s+(a\s+)?new\s+session\b/,
    /\b(hey\s+)?medexa\s+start\s+session\b/,
    /\b(hey\s+)?medexa\s+begin\s+session\b/,
  ],
  startRecording: [
    /\b(hey\s+)?medexa\s+start\s+recording\b/,
    /\b(hey\s+)?medexa\s+start\s+session\b/,
    /\b(hey\s+)?medexa\s+resume\s+(recording|session)?\b/,
    /\bresume\s+(recording|session)\b/,
  ],
  pause: [
    /\b(hey\s+)?medexa\s+pause\s+(recording|session)\b/,
    /\bpause\s+(recording|session)\b/,
  ],
  stop: [
    /\b(hey\s+)?medexa\s+(stop|end)\s+(recording|session)\b/,
    /\b(stop|end)\s+(recording|session)\b/,
  ],
};

const matchesAny = (text: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));
const isLikelyCommand = (text: string) =>
  hasMedexaPrefix(text) || matchesAny(text, [...commandPatterns.pause, ...commandPatterns.stop, ...commandPatterns.startRecording]);

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

const formatElapsed = (value: number) => {
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export function GCCVoiceSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRecognitionRunRef = useRef(false);
  const recognitionStartingRef = useRef(false);
  const manualStopRef = useRef(false);
  const modeRef = useRef<RecognitionMode>("off");
  const statusRef = useRef<SessionStatus>("idle");
  const sessionIdRef = useRef<string | null>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const commandCooldownRef = useRef(0);
  const lastProcessedCommandRef = useRef("");
  const restartTimeoutRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const finalizingRef = useRef(false);
  const stoppedRef = useRef(false);
  const startNavigationInProgressRef = useRef(false);
  const mountedRef = useRef(false);
  const permissionStatusRef = useRef<PermissionState>("unknown");
  const networkRetryRef = useRef(0);
  const lastFinalTextRef = useRef("");
  const latestHeardTextRef = useRef("");
  const transcriptSegmentsRef = useRef<TranscriptSegment[]>([]);
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
  const [latestHeardText, setLatestHeardText] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [finalizationMessage, setFinalizationMessage] = useState<string | null>(null);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);

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
      elapsedMs: accumulatedMsRef.current + (sessionStartedAtRef.current ? performance.now() - sessionStartedAtRef.current : 0),
      startedAt: sessionStartedAtRef.current,
      ...override,
    };
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  }, []);

  const saveRecoveryDraft = useCallback((payload: { sessionId: string; transcript: string; elapsedMs: number; status: "finalizing" | "failed" }) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      `medexa_gcc_session_${payload.sessionId}`,
      JSON.stringify({
        sessionId: payload.sessionId,
        transcript: payload.transcript,
        transcriptSegments: transcriptSegmentsRef.current,
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
    if (!recognitionRef.current || !isRecognitionActive) {
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
  }, [isRecognitionActive]);

  const startRecognition = useCallback((mode: RecognitionMode) => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setErrorMessage(unsupportedMessage);
      setSafeStatus("error");
      return false;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = "en-US";
      recognition.onstart = () => {
        recognitionStartingRef.current = false;
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
          setErrorMessage("Microphone permission is required for Medexa voice commands.");
          safeStopRecognition("abort");
          return;
        }

        if (event.error === "network") {
          networkRetryRef.current = Math.min(networkRetryRef.current + 1, 4);
          setErrorMessage("Voice recognition network connection was interrupted. Retrying...");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          setErrorMessage(event.message || "Voice recognition was interrupted.");
        }
      };
      recognition.onend = () => {
        recognitionStartingRef.current = false;
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

    modeRef.current = mode;
    shouldRecognitionRunRef.current = true;
    manualStopRef.current = false;

    if (recognitionStartingRef.current || isRecognitionActive) {
      return true;
    }

    try {
      recognitionStartingRef.current = true;
      recognitionRef.current.start();
      return true;
    } catch (error) {
      recognitionStartingRef.current = false;
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        return true;
      }
      setErrorMessage(error instanceof Error ? error.message : "Unable to start live voice recognition.");
      return false;
    }
  }, [isRecognitionActive, safeStopRecognition, setSafeStatus]);

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
      setErrorMessage("Microphone permission is required for Medexa voice commands.");
      return false;
    }
  }, []);

  const enableVoiceControl = useCallback(async () => {
    if (!getSpeechRecognitionConstructor()) {
      setErrorMessage(unsupportedMessage);
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

  const appendFinalTranscript = useCallback((text: string, confidence?: number) => {
    const cleanText = text.trim();
    if (!cleanText || cleanText === lastFinalTextRef.current) return;

    lastFinalTextRef.current = cleanText;
    const segment: TranscriptSegment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: cleanText,
      timestampMs: calculateElapsed(),
      isFinal: true,
      confidence,
    };
    const nextSegments = [...transcriptSegmentsRef.current, segment];
    transcriptSegmentsRef.current = nextSegments;
    setTranscriptSegments(nextSegments);
    finalTranscriptRef.current = [finalTranscriptRef.current, cleanText].filter(Boolean).join(" ");
    setFinalTranscript(finalTranscriptRef.current);
    interimTranscriptRef.current = "";
    setInterimTranscript("");
    persistSession({ transcriptSegments: nextSegments, finalTranscript: finalTranscriptRef.current });
  }, [calculateElapsed, persistSession]);

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
    if (finalizingRef.current) return;
    if (stoppedRef.current) return;
    finalizingRef.current = true;
    stoppedRef.current = true;
    setSafeStatus("stopping");
    setFinalizationMessage("Finalizing transcript and generating review...");
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
        throw new Error("No clinical transcript was captured. Continue the session or enter a note before generating SOAP.");
      }

      saveRecoveryDraft({ sessionId: id, transcript, elapsedMs: frozenElapsed, status: "finalizing" });
      const response = await finalizeGCCSession({
        sessionId: id,
        transcript,
        transcriptSegments: transcriptSegmentsRef.current,
        elapsedMs: frozenElapsed,
      });

      if (response.saved_to_store !== true || !response.review_bundle?.soap_note || !response.review_bundle.billing_intelligence || !response.review_bundle.patient_summary) {
        throw new Error("Review generation could not be completed. Your transcript has been saved.");
      }

      const reviewBundle = buildReviewBundleFromFinalizeResponse(response);
      saveReviewBundleLocally(reviewBundle);
      saveSoapLocally({
        sessionId: id,
        soapNote: response.review_bundle.soap_note,
        elapsedMs: frozenElapsed,
        transcript,
        llmUsed: response.llm_used,
        fallbackReason: response.fallback_reason,
      });
      setSafeStatus("stopped");
      persistSession({ status: "stopped", elapsedMs: frozenElapsed });
      setFinalizationMessage(null);
      router.push(`/soap-notes?sessionId=${encodeURIComponent(id)}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Review generation could not be completed. Your transcript has been saved.";
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
      setFinalizationError(message);
      persistSession({ status: "stopped", elapsedMs: failedElapsed });
      finalizingRef.current = false;
      stoppedRef.current = false;
    }
  }, [
    calculateElapsed,
    flushRecognitionBeforeFinalize,
    persistSession,
    router,
    saveRecoveryDraft,
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
    startRecognition("paused-command-only");
    persistSession({ status: "paused", elapsedMs: frozenElapsed });
  }, [calculateElapsed, persistSession, setSafeStatus, startRecognition, stopTimerInterval]);

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
    sessionIdRef.current = null;
    setSessionId(null);
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    transcriptSegmentsRef.current = [];
    lastFinalTextRef.current = "";
    accumulatedMsRef.current = 0;
    sessionStartedAtRef.current = null;
    pausedAtRef.current = null;
    finalizingRef.current = false;
    stoppedRef.current = false;
    startNavigationInProgressRef.current = false;
    setFinalizationMessage(null);
    setFinalizationError(null);
    setFinalTranscript("");
    setInterimTranscript("");
    setTranscriptSegments([]);
    setLatestHeardText("");
    setElapsedMs(0);
    setStartedAt(null);
    setLastCommand(null);
    setErrorMessage(null);
    setSafeStatus("idle");
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [setSafeStatus]);

  const startSession = useCallback(async (options?: StartSessionOptions) => {
    if (!(await enableVoiceControl())) {
      return null;
    }

    const id = options?.sessionId ?? generateSessionId();
    finalizingRef.current = false;
    stoppedRef.current = false;
    sessionIdRef.current = id;
    setSessionId(id);
    if (!options?.preserveTranscript) {
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      transcriptSegmentsRef.current = [];
      lastFinalTextRef.current = "";
      setFinalTranscript("");
      setInterimTranscript("");
      setTranscriptSegments([]);
      accumulatedMsRef.current = 0;
      setElapsedMs(0);
    }
    sessionStartedAtRef.current = performance.now();
    pausedAtRef.current = null;
    setStartedAt(Date.now());
    setSafeStatus("recording");
    startTimerInterval();
    startRecognition("session-transcription");
    persistSession({ sessionId: id, status: "recording", source: options?.source ?? "manual" });
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
    const normalized = normalizeCommandText(rawText);
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

    if (modeRef.current === "ambient-command" && matchesAny(normalized, commandPatterns.startSession)) {
      markCommand("start-session");
      void navigateToSessionFromVoice();
      return true;
    }

    if (modeRef.current === "session-transcription" || modeRef.current === "paused-command-only") {
      if (matchesAny(normalized, commandPatterns.stop) && (hasMedexaPrefix(normalized) || /^(stop|end)\s+(recording|session)$/.test(normalized))) {
        markCommand("stop-recording");
        void finalizeAndNavigateToSoap();
        return true;
      }

      if (matchesAny(normalized, commandPatterns.pause) && (hasMedexaPrefix(normalized) || /^pause\s+(recording|session)$/.test(normalized))) {
        markCommand("pause-recording");
        pauseSession();
        return true;
      }

      if (matchesAny(normalized, commandPatterns.startRecording) && (hasMedexaPrefix(normalized) || /^resume\s+(recording|session)$/.test(normalized))) {
        markCommand("resume-recording");
        resumeSession();
        return true;
      }
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
      if (isCommand || isLikelyCommand(normalizeCommandText(text))) {
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
        appendFinalTranscript(text, alternative.confidence);
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
    if (typeof window !== "undefined") {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PersistedVoiceSession;
          sessionIdRef.current = parsed.sessionId;
          finalTranscriptRef.current = parsed.finalTranscript ?? "";
          transcriptSegmentsRef.current = parsed.transcriptSegments ?? [];
          accumulatedMsRef.current = parsed.elapsedMs ?? 0;
          setSessionId(parsed.sessionId);
          setFinalTranscript(parsed.finalTranscript ?? "");
          setTranscriptSegments(parsed.transcriptSegments ?? []);
          setElapsedMs(parsed.elapsedMs ?? 0);
          setSafeStatus(parsed.status === "recording" ? "idle" : parsed.status);
        } catch {
          window.sessionStorage.removeItem(storageKey);
        }
      }
    }

    return () => {
      mountedRef.current = false;
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
      setPermissionStatus("unknown");
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
        setErrorMessage("Microphone permission is required for Medexa voice commands.");
        safeStopRecognition("abort");
        return;
      }

      if (event.error === "network") {
        networkRetryRef.current = Math.min(networkRetryRef.current + 1, 4);
        setErrorMessage("Voice recognition network connection was interrupted. Retrying...");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setErrorMessage(event.message || "Voice recognition was interrupted.");
      }
    };
    recognition.onend = () => {
      recognitionStartingRef.current = false;
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
    finalizingRef.current = false;
    stoppedRef.current = false;
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
      restartRecognition,
      clearSession,
      formatElapsedTime: (valueToFormat = elapsedMs) => formatElapsed(valueToFormat),
      handleVoiceCommand,
      navigateToSessionFromVoice,
      finalizeAndNavigateToSoap,
      finalizationMessage,
      finalizationError,
      retryFinalize,
    }),
    [
      clearSession,
      elapsedMs,
      enableVoiceControl,
      errorMessage,
      finalTranscript,
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
      resumeSession,
      sessionId,
      startAmbientCommandListening,
      startSession,
      startedAt,
      status,
      stopSession,
      transcriptSegments,
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
