"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { SessionStatus, TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";
import type { SBSMatch } from "@/types/sbs-v3";

type GCCLiveTranscriptPanelProps = {
  status: SessionStatus;
  segments: readonly TranscriptSegment[];
  interimTranscript: string;
  matchesBySegment: ReadonlyMap<string, readonly SBSMatch[]>;
  formatTimestamp: (timestampMs: number) => string;
};

function HighlightedTranscript({ text, matches }: { text: string; matches: readonly SBSMatch[] }) {
  if (matches.length === 0) return text;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  [...matches]
    .sort((left, right) => left.start - right.start)
    .forEach((match) => {
      if (match.start < cursor || match.end > text.length) return;
      if (match.start > cursor) nodes.push(text.slice(cursor, match.start));
      nodes.push(
        <span
          key={match.id}
          tabIndex={0}
          className="gcc-sbs-highlight group relative inline rounded-md bg-gradient-to-r from-sky-100 to-emerald-100 px-1 text-slate-800 outline-none ring-sky-300 transition focus:ring-2"
        >
          {text.slice(match.start, match.end)}
          <span className="pointer-events-none absolute bottom-[calc(100%+7px)] start-1/2 z-30 hidden w-max max-w-[260px] -translate-x-1/2 rounded-xl bg-[#111936] px-3 py-2 text-start text-[10px] font-semibold leading-4 text-white shadow-xl group-hover:block group-focus:block">
            <span className="block text-emerald-300">SBS V3</span>
            <bdi dir="ltr" className="block font-mono text-white">{match.code}</bdi>
            <span dir="auto" className="block font-normal text-slate-200">{match.officialTitle}</span>
          </span>
        </span>,
      );
      cursor = match.end;
    });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

export default function GCCLiveTranscriptPanel({
  status,
  segments,
  interimTranscript,
  matchesBySegment,
  formatTimestamp,
}: GCCLiveTranscriptPanelProps) {
  const { t } = useGCCLocale();
  const feedRef = useRef<HTMLDivElement>(null);
  const visibleSegments = segments.filter((segment) => segment.isFinal && segment.text.trim());

  useEffect(() => {
    if (visibleSegments.length === 0 && !interimTranscript) return;
    const animationFrame = window.requestAnimationFrame(() => {
      const feed = feedRef.current;
      if (feed) feed.scrollTop = feed.scrollHeight;
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [interimTranscript, visibleSegments.length]);

  const helperText = status === "paused"
    ? t("session.liveTranscript.pausedHelper")
    : status === "stopped"
      ? t("session.liveTranscript.stopHelper")
      : null;
  const isEmpty = visibleSegments.length === 0 && !interimTranscript.trim();

  return (
    <section aria-labelledby="live-transcript-title" className="mx-auto w-full max-w-[700px] rounded-[22px] border border-indigo-100 bg-white/95 p-4 shadow-[0_12px_32px_rgba(30,41,90,0.07)] sm:p-5">
      <div>
        <h2 id="live-transcript-title" className="text-[17px] font-bold tracking-[-0.02em] text-[#151a36]">
          {t("session.liveTranscript.title")}
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500 sm:text-[13px]">
          {t("session.liveTranscript.subtitle")}
        </p>
      </div>

      <div ref={feedRef} role="log" aria-live="polite" aria-relevant="additions text" aria-label={t("session.liveTranscript.feedLabel")} className="mt-3 max-h-[260px] min-h-[96px] overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 [scrollbar-gutter:stable] sm:px-4">
        {isEmpty ? (
          <p className="grid min-h-[70px] place-items-center text-center text-[13px] font-medium text-slate-400">
            Listening for the conversation...
          </p>
        ) : (
          <div className="space-y-3">
            {visibleSegments.map((segment) => {
              const isClinician = segment.speaker === "clinician";
              const speakerLabel = segment.speakerLabel || (segment.speaker
                ? t(isClinician ? "session.liveTranscript.clinician" : "session.liveTranscript.patient")
                : null);
              return (
                <article key={segment.id} className={`gcc-live-transcript-line grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3 rounded-xl border bg-white px-3 py-2.5 sm:grid-cols-[54px_minmax(0,1fr)] sm:gap-4 ${isClinician ? "border-indigo-100" : "border-emerald-100"}`}>
                  <time dir="ltr" className="pt-0.5 text-[11px] tabular-nums text-slate-400 sm:text-[12px]">{formatTimestamp(segment.timestampMs)}</time>
                  <div className="min-w-0">
                    {speakerLabel && <strong dir="auto" className={`text-[11px] font-bold ${isClinician ? "text-indigo-700" : "text-emerald-700"}`}>{speakerLabel}:</strong>}
                    <p dir="auto" className="mt-1 text-[13px] leading-[1.55] text-slate-700 sm:text-[14px]">
                      <HighlightedTranscript text={segment.text} matches={matchesBySegment.get(segment.id) ?? []} />
                    </p>
                  </div>
                </article>
              );
            })}
            {interimTranscript.trim() && (
              <article className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/50 px-3 py-2.5 opacity-85 sm:grid-cols-[54px_minmax(0,1fr)] sm:gap-4">
                <time dir="ltr" className="pt-0.5 text-[11px] tabular-nums text-slate-400">{t("session.transcript.now")}</time>
                <p dir="auto" className="text-[13px] italic leading-[1.55] text-slate-600 sm:text-[14px]">
                  <HighlightedTranscript text={interimTranscript} matches={matchesBySegment.get("interim") ?? []} />
                </p>
              </article>
            )}
          </div>
        )}
      </div>
      {helperText && <p className="mt-3 text-[11px] font-medium text-slate-500">{helperText}</p>}
    </section>
  );
}
