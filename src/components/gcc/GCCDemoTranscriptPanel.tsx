"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowDown, Stethoscope, UserRound } from "lucide-react";
import {
  GCC_DEMO_SESSION_TRANSCRIPT,
  type GCCDemoTranscriptLine,
} from "@/data/gcc-demo-session-transcript";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { SessionStatus, TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";

type GCCDemoTranscriptPanelProps = {
  status: SessionStatus;
  segments: readonly TranscriptSegment[];
  onAppendLine: (line: GCCDemoTranscriptLine) => boolean;
};

function getRestoredProgress(segments: readonly TranscriptSegment[]) {
  const appendedIds = new Set(
    segments
      .filter((segment) => segment.source === "manual-demo")
      .map((segment) => segment.id),
  );

  let progress = 0;
  while (
    progress < GCC_DEMO_SESSION_TRANSCRIPT.length &&
    appendedIds.has(GCC_DEMO_SESSION_TRANSCRIPT[progress].id)
  ) {
    progress += 1;
  }
  return progress;
}

export default function GCCDemoTranscriptPanel({
  status,
  segments,
  onAppendLine,
}: GCCDemoTranscriptPanelProps) {
  const { t } = useGCCLocale();
  const feedRef = useRef<HTMLDivElement>(null);
  const demoTranscriptIndex = useMemo(() => getRestoredProgress(segments), [segments]);
  const visibleDemoLines = GCC_DEMO_SESSION_TRANSCRIPT.slice(0, demoTranscriptIndex);
  const isComplete = demoTranscriptIndex >= GCC_DEMO_SESSION_TRANSCRIPT.length;
  const isPaused = status === "paused";
  const canAdvance = status === "recording" && !isComplete;

  useEffect(() => {
    if (demoTranscriptIndex === 0) return;
    const animationFrame = window.requestAnimationFrame(() => {
      const feed = feedRef.current;
      if (feed) feed.scrollTop = feed.scrollHeight;
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [demoTranscriptIndex]);

  const handleNextLine = useCallback(() => {
    if (!canAdvance) return;
    const nextLine = GCC_DEMO_SESSION_TRANSCRIPT[demoTranscriptIndex];
    if (nextLine) onAppendLine(nextLine);
  }, [canAdvance, demoTranscriptIndex, onAppendLine]);

  const helperText = isComplete
    ? t("session.demoTranscript.stopHelper")
    : isPaused
      ? t("session.demoTranscript.pausedHelper")
      : status !== "recording"
        ? t("session.demoTranscript.startHelper")
        : null;

  return (
    <section
      aria-labelledby="demo-transcript-title"
      className="mx-auto w-full max-w-[700px] rounded-[22px] border border-indigo-100 bg-white/95 p-4 shadow-[0_12px_32px_rgba(30,41,90,0.07)] sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">
            {t("session.demoTranscript.label")}
          </p>
          <h2 id="demo-transcript-title" className="text-[17px] font-bold tracking-[-0.02em] text-[#151a36]">
            {t("session.demoTranscript.title")}
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500 sm:text-[13px]">
            {t("session.demoTranscript.subtitle")}
          </p>
        </div>
        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
          {demoTranscriptIndex}/{GCC_DEMO_SESSION_TRANSCRIPT.length}
        </span>
      </div>

      <div
        ref={feedRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t("session.demoTranscript.feedLabel")}
        className="mt-3 max-h-[220px] min-h-[72px] overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 [scrollbar-gutter:stable] sm:px-4"
      >
        {visibleDemoLines.length === 0 ? (
          <div className="grid min-h-[46px] place-items-center text-center">
            <p className="text-[12px] font-medium text-slate-400 sm:text-[13px]">
              {t("session.demoTranscript.empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleDemoLines.map((line, index) => {
              const isClinician = line.speaker === "clinician";
              const speakerLabel = t(
                isClinician
                  ? "session.demoTranscript.clinician"
                  : "session.demoTranscript.patient",
              );
              return (
                <article
                  key={line.id}
                  className={`gcc-demo-transcript-line rounded-xl border bg-white px-3 py-2.5 transition duration-300 ${
                    isClinician ? "border-indigo-100" : "border-emerald-100"
                  }`}
                  data-newest-demo-line={index === visibleDemoLines.length - 1 ? "true" : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isClinician
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isClinician ? (
                        <Stethoscope className="size-3" aria-hidden="true" />
                      ) : (
                        <UserRound className="size-3" aria-hidden="true" />
                      )}
                      {speakerLabel}
                    </span>
                  </div>
                  <p dir="auto" className="mt-1.5 text-[13px] leading-[1.45] text-slate-700 sm:text-[14px]">
                    {line.text}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
        <p className="min-h-4 text-[11px] font-medium text-slate-500">
          {helperText}
        </p>
        <button
          type="button"
          aria-label={t("session.demoTranscript.nextAriaLabel")}
          disabled={!canAdvance}
          onClick={handleNextLine}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-[#111936] px-4 text-[11px] font-bold text-white shadow-sm transition hover:bg-indigo-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
        >
          {isComplete
            ? t("session.demoTranscript.complete")
            : t("session.demoTranscript.next")}
          {!isComplete && <ArrowDown className="size-3.5" aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
