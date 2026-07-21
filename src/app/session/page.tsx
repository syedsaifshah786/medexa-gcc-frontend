"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, BadgeCheck, CheckCircle2, RotateCcw, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import GCCClaimQualityDropdown from "@/components/gcc/GCCClaimQualityDropdown";
import GCCLiveTranscriptPanel from "@/components/gcc/GCCLiveTranscriptPanel";
import GCCHeader from "@/components/gcc/GCCHeader";
import GCCInsightsSheet from "@/components/gcc/GCCInsightsSheet";
import GCCSessionHero from "@/components/gcc/GCCSessionHero";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import { useGCCLiveInsights } from "@/hooks/useGCCLiveInsights";
import { useGCCVoiceSession } from "@/hooks/useGCCVoiceSession";
import { useSBSKeywordDetection } from "@/hooks/useSBSKeywordDetection";
import {
  loadSelectedUpcomingSession,
  type GCCSelectedPatientSession,
} from "@/lib/gcc/upcoming-session-storage";

type ResolvedPatientSession = {
  patientId: string | null;
  session: GCCSelectedPatientSession | null;
};

export default function GCCSessionPage() {
  return (
    <Suspense fallback={null}>
      <GCCSessionPageContent />
    </Suspense>
  );
}

function GCCSessionPageContent() {
  const searchParams = useSearchParams();
  const hasAutoStartedRef = useRef(false);
  const { locale, t, formatNumber, formatSessionProgress } = useGCCLocale();
  const {
    sessionId,
    status,
    finalTranscript,
    transcriptSegments,
    transcriptRevision,
    interimTranscript,
    errorMessage,
    permissionStatus,
    finalizationMessage,
    finalizationError,
    formatElapsedTime,
    elapsedMs,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    retryFinalize,
    setSessionPatient,
    setSBSMatches,
  } = useGCCVoiceSession();

  const patientId = searchParams.get("patientId")?.trim() || null;
  const [resolvedPatientSession, setResolvedPatientSession] = useState<ResolvedPatientSession>({
    patientId: null,
    session: null,
  });
  useEffect(() => {
    const session = patientId ? loadSelectedUpcomingSession(patientId) : null;
    // The selection is browser-only data and must be resolved after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolvedPatientSession({ patientId, session });
  }, [patientId]);
  const selectionResolved = resolvedPatientSession.patientId === patientId;
  const selectedSession = selectionResolved ? resolvedPatientSession.session : null;
  const patientName = selectedSession?.patientName || searchParams.get("patientName")?.trim() || "Patient";
  const patientSessionType = selectedSession?.sessionType || searchParams.get("sessionType")?.trim() || null;
  const patientAvatar = selectedSession?.avatarUrl || searchParams.get("avatarUrl")?.trim() || null;
  const patientAge = searchParams.get("patientAge")?.trim() || "";
  const patientGender = searchParams.get("patientGender")?.trim() || "";
  const completedSessions = searchParams.get("completedSessions")?.trim() || "";
  const totalSessions = searchParams.get("totalSessions")?.trim() || "";
  const isPatientVerified = selectedSession
    ? selectedSession.nphiesStatus === "Cleared" || selectedSession.nphiesStatus === "Verified"
    : searchParams.get("verified") === "1";
  const patient = useMemo(
    () => ({ id: patientId, name: patientName, sessionType: patientSessionType }),
    [patientId, patientName, patientSessionType],
  );
  const sessionPatient = useMemo(() => {
    const numericAge = Number(patientAge);
    const normalizedGender = patientGender.toLocaleLowerCase("en-US");
    const gender = normalizedGender === "m" || normalizedGender === "male"
      ? "Male"
      : normalizedGender === "f" || normalizedGender === "female"
        ? "Female"
        : patientGender;
    return {
      name: patientName,
      age: patientAge && Number.isFinite(numericAge) ? numericAge : null,
      gender,
    };
  }, [patientAge, patientGender, patientName]);
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isFinalizing = status === "stopping";
  const sbsDetection = useSBSKeywordDetection(transcriptSegments, interimTranscript);
  const liveInsights = useGCCLiveInsights({
    locale,
    sessionId,
    isRecording,
    isPaused,
    isFinalizing,
    transcriptRevision,
    finalizedTranscript: finalTranscript,
    interimTranscript,
    transcriptSegments,
    elapsedMs,
    patient,
    sbsMatches: sbsDetection.matches,
  });
  useEffect(() => {
    setSBSMatches(sbsDetection.finalizedMatches);
  }, [sbsDetection.finalizedMatches, setSBSMatches]);
  useEffect(() => {
    if (!selectionResolved) return;
    setSessionPatient(sessionPatient);
  }, [selectionResolved, sessionPatient, setSessionPatient]);

  useEffect(() => {
    if (searchParams.get("autoStart") !== "1" || !selectionResolved || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    const requestedSessionId = searchParams.get("sessionId") ?? undefined;
    if (status === "recording" && sessionId && (!requestedSessionId || requestedSessionId === sessionId)) {
      return;
    }
    void startSession({
      sessionId: requestedSessionId,
      source: "manual",
      preserveTranscript: Boolean(requestedSessionId && requestedSessionId === sessionId),
      patient: sessionPatient,
    });
  }, [searchParams, selectionResolved, sessionId, sessionPatient, startSession, status]);

  const initials = selectedSession?.initials || patientName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const numericPatientAge = Number(patientAge);
  const displayedAge = patientAge && Number.isFinite(numericPatientAge)
    ? formatNumber(numericPatientAge)
    : "—";
  const normalizedGender = patientGender.toLocaleLowerCase("en-US");
  const displayedGender =
    normalizedGender === "m" || normalizedGender === "male"
      ? t("session.page.gender.male")
      : normalizedGender === "f" || normalizedGender === "female"
        ? t("session.page.gender.female")
        : patientGender || "—";
  const numericCompletedSessions = Number(completedSessions);
  const numericTotalSessions = Number(totalSessions);
  const sessionProgress =
    completedSessions && totalSessions && Number.isFinite(numericCompletedSessions) && Number.isFinite(numericTotalSessions) && numericTotalSessions > 0
      ? formatSessionProgress(numericCompletedSessions, numericTotalSessions)
      : "—";
  const selectedSessionDetails = selectedSession
    ? [selectedSession.sessionType, selectedSession.status, selectedSession.referenceId]
        .filter(Boolean)
        .join(" | ")
    : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_12%,rgba(238,242,255,0.7),transparent_34%),linear-gradient(180deg,#ffffff_0%,#fdfdff_100%)] text-slate-900">
      <GCCHeader />
      <main className="gcc-session-workspace pb-10 pt-5 sm:pt-6">
        <section className="relative z-30 mb-2 flex min-h-[74px] flex-wrap items-center justify-between gap-4 px-1 sm:px-2">
          <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
            <button
              type="button"
              aria-label={t("session.page.goBack")}
              title={t("session.page.goBack")}
              onClick={() => history.back()}
              className="grid size-9 shrink-0 place-items-center rounded-full text-[#12162b] transition hover:bg-indigo-50 hover:text-[#071bd8] active:scale-95"
            >
              <ArrowLeft className="size-[22px] rtl:rotate-180" strokeWidth={2.3} aria-hidden="true" />
            </button>
            {patientAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- Session patient avatars can be user-provided remote URLs.
              <img
                src={patientAvatar}
                alt=""
                className="size-14 shrink-0 rounded-full object-cover ring-2 ring-white shadow-[0_4px_14px_rgba(15,23,42,0.12)] sm:size-[60px]"
              />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-[14px] font-extrabold text-indigo-700 ring-2 ring-white sm:size-[60px]">
                {initials || <UserRound className="size-5" aria-hidden="true" />}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="truncate text-[19px] font-medium tracking-[-0.02em] text-[#1d1d22] sm:text-[24px]">
                  <bdi dir="auto">{patientName}</bdi>
                </h1>
                <span className="text-[14px] font-normal text-[#4c4c53] sm:text-[17px]">
                  {t("session.page.ageAndGender", {
                    age: displayedAge,
                    gender: displayedGender,
                  })}
                </span>
                {isPatientVerified && (
                  <span
                    className="inline-grid size-7 place-items-center text-[#70a900]"
                    title={t("session.page.verifiedPatient")}
                    aria-label={t("session.page.verifiedPatient")}
                  >
                    <BadgeCheck className="size-7" strokeWidth={2.2} aria-hidden="true" />
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[14px] font-normal text-[#31313a] sm:text-[16px]">
                {selectedSessionDetails || t("session.page.progress", { progress: sessionProgress })}
              </p>
            </div>
          </div>

          <GCCClaimQualityDropdown readiness={liveInsights.claimReadiness} insightStatus={liveInsights.status} sessionStatus={status} lastUpdatedAt={liveInsights.lastUpdatedAt} segmentCount={transcriptSegments.length} hasTranscript={Boolean(finalTranscript || interimTranscript)} sbsMatchCount={sbsDetection.matches.length} />
        </section>

        <div className="mx-auto w-full max-w-[820px]">
          <GCCSessionHero
            timer={formatElapsedTime(elapsedMs)}
            status={status}
            onStartRecording={() => void startSession({ sessionId: sessionId ?? undefined, source: "manual", preserveTranscript: true, patient: sessionPatient })}
            onPauseRecording={pauseSession}
            onResumeRecording={resumeSession}
            onStopRecording={stopSession}
          />

          {errorMessage && (
            <div role="alert" className="mx-auto mt-3 flex w-full max-w-[700px] flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-amber-800 shadow-sm">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <p className="text-[12px] font-bold">{errorMessage}</p>
              {permissionStatus === "denied" && <button type="button" onClick={() => void startSession({ sessionId: sessionId ?? undefined, source: "manual", preserveTranscript: true, patient: sessionPatient })} className="ms-1 h-8 rounded-full bg-[#111936] px-3 text-[11px] font-bold text-white">Retry Microphone</button>}
            </div>
          )}

          {(finalizationMessage || finalizationError) && (
            <div
              role={finalizationError ? "alert" : "status"}
              className={`mx-auto mt-3 flex w-full max-w-[700px] flex-wrap items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center shadow-sm ${finalizationError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-indigo-100 bg-indigo-50/90 text-indigo-700"}`}
            >
              {finalizationError ? <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />}
              <p className="text-[12px] font-bold">{finalizationError || finalizationMessage}</p>
              {finalizationError && (
                <div className="ms-1 flex items-center gap-2">
                  <button type="button" onClick={() => void retryFinalize()} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#111936] px-3 text-[11px] font-bold text-white transition hover:bg-indigo-950 active:scale-95">
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    {t("common.retry")}
                  </button>
                  <button type="button" onClick={resumeSession} className="h-8 rounded-full border border-rose-200 bg-white px-3 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95">
                    {t("session.page.returnToSession")}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex min-w-0 flex-col gap-7 sm:mt-5 sm:gap-8">
            <GCCLiveTranscriptPanel
              status={status}
              segments={transcriptSegments}
              interimTranscript={interimTranscript}
              matchesBySegment={sbsDetection.matchesBySegment}
              formatTimestamp={formatElapsedTime}
            />
            <GCCInsightsSheet activeSuggestions={liveInsights.activeSuggestions} status={liveInsights.status} lastUpdatedAt={liveInsights.lastUpdatedAt} hasTranscript={Boolean(finalTranscript || interimTranscript)} onApprove={liveInsights.approveSuggestion} onIgnore={liveInsights.ignoreSuggestion} />
          </div>
        </div>
      </main>
    </div>
  );
}
