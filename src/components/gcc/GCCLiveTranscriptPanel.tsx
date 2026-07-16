"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowDown } from "lucide-react";
import {
  GCC_DEMO_SESSION_TRANSCRIPT,
  type GCCDemoTranscriptLine,
} from "@/data/gcc-demo-session-transcript";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { SessionStatus, TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";

type GCCLiveTranscriptPanelProps = {
  status: SessionStatus;
  segments: readonly TranscriptSegment[];
  formatTimestamp: (timestampMs: number) => string;
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

export default function GCCLiveTranscriptPanel({
  status,
  segments,
  formatTimestamp,
  onAppendLine,
}: GCCLiveTranscriptPanelProps) {
  const { t } = useGCCLocale();
  const feedRef = useRef<HTMLDivElement>(null);
  const transcriptIndex = useMemo(() => getRestoredProgress(segments), [segments]);
  const transcriptLineIds = useMemo(
    () => new Set(GCC_DEMO_SESSION_TRANSCRIPT.map((line) => line.id)),
    [],
  );
  const visibleTranscriptSegments = useMemo(
    () =>
      segments.filter(
        (segment) =>
          segment.isFinal &&
          segment.source === "manual-demo" &&
          transcriptLineIds.has(segment.id),
      ),
    [segments, transcriptLineIds],
  );
  const isComplete = transcriptIndex >= GCC_DEMO_SESSION_TRANSCRIPT.length;
  const isPaused = status === "paused";
  const canAdvance = status === "recording" && !isComplete;

  useEffect(() => {
    if (visibleTranscriptSegments.length === 0) return;
    const animationFrame = window.requestAnimationFrame(() => {
      const feed = feedRef.current;
      if (feed) feed.scrollTop = feed.scrollHeight;
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [visibleTranscriptSegments.length]);

  const handleNextLine = useCallback(() => {
    if (!canAdvance) return;
    const nextLine = GCC_DEMO_SESSION_TRANSCRIPT[transcriptIndex];
    if (nextLine) onAppendLine(nextLine);
  }, [canAdvance, onAppendLine, transcriptIndex]);

  const helperText = isComplete
    ? t("session.liveTranscript.stopHelper")
    : isPaused
      ? t("session.liveTranscript.pausedHelper")
      : status !== "recording"
        ? t("session.liveTranscript.startHelper")
        : null;

  return (
    <section
      aria-labelledby="live-transcript-title"
      className="mx-auto w-full max-w-[700px] rounded-[22px] border border-indigo-100 bg-white/95 p-4 shadow-[0_12px_32px_rgba(30,41,90,0.07)] sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="live-transcript-title" className="text-[17px] font-bold tracking-[-0.02em] text-[#151a36]">
            {t("session.liveTranscript.title")}
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500 sm:text-[13px]">
            {t("session.liveTranscript.subtitle")}
          </p>
        </div>
        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
          {transcriptIndex}/{GCC_DEMO_SESSION_TRANSCRIPT.length}
        </span>
      </div>

      <div
        ref={feedRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t("session.liveTranscript.feedLabel")}
        className="mt-3 max-h-[220px] min-h-[72px] overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 [scrollbar-gutter:stable] sm:px-4"
      >
        <div className="min-h-[46px] space-y-3">
          {visibleTranscriptSegments.map((segment, index) => {
            const isClinician = segment.speaker === "clinician";
            const speakerLabel = t(
              isClinician
                ? "session.liveTranscript.clinician"
                : "session.liveTranscript.patient",
            );
            return (
              <article
                key={segment.id}
                className={`gcc-live-transcript-line grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3 rounded-xl border bg-white px-3 py-2.5 transition duration-300 sm:grid-cols-[54px_minmax(0,1fr)] sm:gap-4 ${
                  isClinician ? "border-indigo-100" : "border-emerald-100"
                }`}
                data-newest-transcript-line={index === visibleTranscriptSegments.length - 1 ? "true" : undefined}
              >
                <time dir="ltr" className="pt-0.5 text-[11px] tabular-nums text-slate-400 sm:text-[12px]">
                  {formatTimestamp(segment.timestampMs)}
                </time>
                <div className="min-w-0">
                  <strong
                    className={`text-[11px] font-bold ${
                      isClinician ? "text-indigo-700" : "text-emerald-700"
                    }`}
                  >
                    {speakerLabel}
                    {":"}
                  </strong>
                  <p dir="auto" className="mt-1 text-[13px] leading-[1.45] text-slate-700 sm:text-[14px]">
                    {segment.text}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
        <p className="min-h-4 text-[11px] font-medium text-slate-500">
          {helperText}
        </p>
        <button
          type="button"
          aria-label={t("session.liveTranscript.nextAriaLabel")}
          disabled={!canAdvance}
          onClick={handleNextLine}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-[#111936] px-4 text-[11px] font-bold text-white shadow-sm transition hover:bg-indigo-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
        >
          {isComplete
            ? t("session.liveTranscript.complete")
            : t("session.liveTranscript.next")}
          {!isComplete && <ArrowDown className="size-3.5" aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
