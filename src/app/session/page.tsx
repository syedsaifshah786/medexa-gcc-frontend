"use client";

import { Suspense, useEffect, useMemo } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, RotateCcw, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import GCCClaimQualityDropdown from "@/components/gcc/GCCClaimQualityDropdown";
import GCCHeader from "@/components/gcc/GCCHeader";
import GCCInsightsSheet from "@/components/gcc/GCCInsightsSheet";
import GCCSessionHero from "@/components/gcc/GCCSessionHero";
import GCCTranscript from "@/components/gcc/GCCTranscript";
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
  } = useGCCVoiceSession();

  const patientId = searchParams.get("patientId")?.trim() || null;
  const patientName = searchParams.get("patientName")?.trim() || "Samuel Thompson";
  const patientSessionType = searchParams.get("sessionType")?.trim() || null;
  const patient = useMemo(
    () => ({ id: patientId, name: patientName, sessionType: patientSessionType }),
    [patientId, patientName, patientSessionType],
  );
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isFinalizing = status === "stopping";
  const hasTranscript = Boolean(finalTranscript.trim() || interimTranscript.trim() || transcriptSegments.length);
  const liveInsights = useGCCLiveInsights({
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

  useEffect(() => {
    if (searchParams.get("autoStart") !== "1") return;
    if (status === "recording" || status === "paused" || status === "stopping" || status === "stopped") return;
    const requestedSessionId = searchParams.get("sessionId") ?? undefined;
    void startSession({
      sessionId: requestedSessionId,
      source: searchParams.get("source") === "voice" ? "voice" : "manual",
      preserveTranscript: Boolean(requestedSessionId && requestedSessionId === sessionId),
    });
  }, [searchParams, sessionId, startSession, status]);

  const initials = patientName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_10%,rgba(199,210,254,0.38),transparent_34%),linear-gradient(180deg,#f7f8fc_0%,#f1f5f9_100%)] text-slate-900">
      <GCCHeader />
      <main className="gcc-session-workspace pb-8 pt-3 sm:pt-4">
        <section className="mb-4 flex min-h-[66px] flex-wrap items-center justify-between gap-3 rounded-[16px] border border-white/90 bg-white/90 px-3.5 py-3 shadow-[0_10px_30px_rgba(37,48,93,0.07)] backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Go back"
              title="Go back"
              onClick={() => history.back()}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-700 active:scale-95"
            >
              <ArrowLeft className="size-[18px]" aria-hidden="true" />
            </button>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-[12px] font-extrabold text-indigo-700 ring-2 ring-white">
              {initials || <UserRound className="size-[18px]" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="truncate text-[14px] font-extrabold text-slate-900">{patientName}</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isRecording ? "bg-emerald-50 text-emerald-700" : isPaused ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  <i className={`size-1.5 rounded-full ${isRecording ? "bg-emerald-500" : isPaused ? "bg-amber-500" : "bg-slate-400"}`} aria-hidden="true" />
                  {isRecording ? "Live" : isPaused ? "Paused" : isFinalizing ? "Finalizing" : "GCC Session"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                {patientSessionType || "Ambient listening"}
                {sessionId ? ` \u00b7 Session ${sessionId.slice(0, 8)}` : " \u00b7 Session preparing"}
              </p>
            </div>
          </div>

          <GCCClaimQualityDropdown
            readiness={liveInsights.claimReadiness}
            insightStatus={liveInsights.status}
            sessionStatus={status}
            lastUpdatedAt={liveInsights.lastUpdatedAt}
          />
        </section>

        <GCCSessionHero
          timer={formatElapsedTime(elapsedMs)}
          status={status}
          onStartRecording={() => void startSession({ sessionId: sessionId ?? undefined, source: "manual", preserveTranscript: true })}
          onPauseRecording={pauseSession}
          onResumeRecording={resumeSession}
          onStopRecording={stopSession}
        />

        {(finalizationMessage || finalizationError) && (
          <div
            role={finalizationError ? "alert" : "status"}
            className={`mx-auto mt-3 flex w-full max-w-[760px] flex-wrap items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center shadow-sm ${finalizationError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-indigo-100 bg-indigo-50/90 text-indigo-700"}`}
          >
            {finalizationError ? <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />}
            <p className="text-[12px] font-bold">{finalizationError || finalizationMessage}</p>
            {finalizationError && (
              <div className="ml-1 flex items-center gap-2">
                <button type="button" onClick={() => void retryFinalize()} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#111936] px-3 text-[11px] font-bold text-white transition hover:bg-indigo-950 active:scale-95">
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Retry
                </button>
                <button type="button" onClick={resumeSession} className="h-8 rounded-full border border-rose-200 bg-white px-3 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95">
                  Return to Session
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(320px,0.85fr)_minmax(500px,1.35fr)]">
          <GCCTranscript
            segments={transcriptSegments}
            interimTranscript={interimTranscript}
            status={status}
            formatTimestamp={formatElapsedTime}
          />
          <GCCInsightsSheet
            suggestions={liveInsights.suggestions}
            claimReadiness={liveInsights.claimReadiness}
            status={liveInsights.status}
            lastUpdatedAt={liveInsights.lastUpdatedAt}
            hasTranscript={hasTranscript}
            onApprove={liveInsights.approveSuggestion}
            onIgnore={liveInsights.ignoreSuggestion}
          />
        </div>
      </main>
    </div>
  );
}
