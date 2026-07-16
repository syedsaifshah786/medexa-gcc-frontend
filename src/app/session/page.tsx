"use client";

import { Suspense, useEffect, useMemo } from "react";
import { AlertCircle, ArrowLeft, BadgeCheck, CheckCircle2, RotateCcw, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import GCCClaimQualityDropdown from "@/components/gcc/GCCClaimQualityDropdown";
import GCCHeader from "@/components/gcc/GCCHeader";
import GCCInsightsSheet from "@/components/gcc/GCCInsightsSheet";
import GCCSessionHero from "@/components/gcc/GCCSessionHero";
import GCCTranscript from "@/components/gcc/GCCTranscript";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import { useGCCLiveInsights } from "@/hooks/useGCCLiveInsights";
import { useGCCVoiceSession } from "@/hooks/useGCCVoiceSession";

export default function GCCSessionPage() {
  return (
    <Suspense fallback={null}>
      <GCCSessionPageContent />
    </Suspense>
  );
}

function GCCSessionPageContent() {
  const searchParams = useSearchParams();
  const { locale, t, formatNumber, formatSessionProgress } = useGCCLocale();
  const {
    sessionId,
    status,
    finalTranscript,
    transcriptSegments,
    interimTranscript,
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
  } = useGCCVoiceSession();

  const patientId = searchParams.get("patientId")?.trim() || null;
  const patientName = searchParams.get("patientName")?.trim() || "Samuel Thompson";
  const patientSessionType = searchParams.get("sessionType")?.trim() || null;
  const patientAvatar =
    searchParams.get("avatarUrl")?.trim() ||
    (patientName === "Samuel Thompson" ? "https://i.pravatar.cc/96?img=12" : null);
  const patientAge = searchParams.get("patientAge")?.trim() || "58";
  const patientGender = searchParams.get("patientGender")?.trim() || "M";
  const completedSessions = searchParams.get("completedSessions")?.trim() || "04";
  const totalSessions = searchParams.get("totalSessions")?.trim() || "12";
  const isPatientVerified = searchParams.get("verified") !== "0";
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
      age: Number.isFinite(numericAge) ? numericAge : null,
      gender,
    };
  }, [patientAge, patientGender, patientName]);
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isFinalizing = status === "stopping";
  const liveInsights = useGCCLiveInsights({
    locale,
    sessionId,
    isRecording,
    isPaused,
    isFinalizing,
    finalizedTranscript: finalTranscript,
    interimTranscript,
    transcriptSegments,
    elapsedMs,
    patient,
  });
  const transcriptHighlights = useMemo(
    () => [...new Set(liveInsights.activeSuggestions.map((suggestion) => suggestion.evidence.trim()).filter(Boolean))],
    [liveInsights.activeSuggestions],
  );

  useEffect(() => {
    setSessionPatient(sessionPatient);
  }, [sessionPatient, setSessionPatient]);

  useEffect(() => {
    if (searchParams.get("autoStart") !== "1") return;
    if (status === "recording" || status === "paused" || status === "stopping" || status === "stopped") return;
    const requestedSessionId = searchParams.get("sessionId") ?? undefined;
    void startSession({
      sessionId: requestedSessionId,
      source: searchParams.get("source") === "voice" ? "voice" : "manual",
      preserveTranscript: Boolean(requestedSessionId && requestedSessionId === sessionId),
      patient: sessionPatient,
    });
  }, [searchParams, sessionId, sessionPatient, startSession, status]);

  const initials = patientName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const numericPatientAge = Number(patientAge);
  const displayedAge = Number.isFinite(numericPatientAge)
    ? formatNumber(numericPatientAge)
    : patientAge;
  const normalizedGender = patientGender.toLocaleLowerCase("en-US");
  const displayedGender =
    normalizedGender === "m" || normalizedGender === "male"
      ? t("session.page.gender.male")
      : normalizedGender === "f" || normalizedGender === "female"
        ? t("session.page.gender.female")
        : patientGender || t("session.page.gender.other");
  const numericCompletedSessions = Number(completedSessions);
  const numericTotalSessions = Number(totalSessions);
  const sessionProgress =
    Number.isFinite(numericCompletedSessions) && Number.isFinite(numericTotalSessions)
      ? formatSessionProgress(numericCompletedSessions, numericTotalSessions)
      : `${completedSessions} / ${totalSessions}`;

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
                {t("session.page.progress", { progress: sessionProgress })}
              </p>
            </div>
          </div>

          <GCCClaimQualityDropdown />
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
            <GCCTranscript
              segments={transcriptSegments}
              interimTranscript={interimTranscript}
              status={status}
              formatTimestamp={formatElapsedTime}
              highlights={transcriptHighlights}
            />
            <GCCInsightsSheet />
          </div>
        </div>
      </main>
    </div>
  );
}
