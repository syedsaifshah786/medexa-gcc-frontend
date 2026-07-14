"use client";

import { useEffect, useRef } from "react";
import type { SessionStatus, TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";

type GCCTranscriptProps = {
  segments?: TranscriptSegment[];
  interimTranscript?: string;
  status?: SessionStatus;
  formatTimestamp?: (timestampMs: number) => string;
};

const nearBottomThreshold = 56;

function getStatusPresentation(status: SessionStatus) {
  switch (status) {
    case "recording":
      return { label: "Listening", dotClassName: "bg-emerald-500", badgeClassName: "border-emerald-100 bg-emerald-50 text-emerald-700" };
    case "paused":
      return { label: "Paused", dotClassName: "bg-amber-500", badgeClassName: "border-amber-100 bg-amber-50 text-amber-700" };
    case "stopping":
      return { label: "Finalizing", dotClassName: "bg-indigo-500", badgeClassName: "border-indigo-100 bg-indigo-50 text-indigo-700" };
    case "starting":
      return { label: "Starting", dotClassName: "bg-sky-500", badgeClassName: "border-sky-100 bg-sky-50 text-sky-700" };
    case "stopped":
      return { label: "Stopped", dotClassName: "bg-slate-400", badgeClassName: "border-slate-200 bg-slate-50 text-slate-600" };
    default:
      return { label: "Ready", dotClassName: "bg-slate-400", badgeClassName: "border-slate-200 bg-slate-50 text-slate-600" };
  }
}

export default function GCCTranscript({
  segments = [],
  interimTranscript = "",
  status = "idle",
  formatTimestamp,
}: GCCTranscriptProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const finalizedSegments = segments.filter((segment) => segment.isFinal);
  const hasTranscript = finalizedSegments.length > 0 || Boolean(interimTranscript.trim());
  const statusPresentation = getStatusPresentation(status);

  useEffect(() => {
    if (!shouldFollowRef.current) return;

    const animationFrame = window.requestAnimationFrame(() => {
      const scrollArea = scrollAreaRef.current;
      if (!scrollArea || !shouldFollowRef.current) return;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [interimTranscript, segments.length]);

  return (
    <section
      aria-labelledby="live-transcription-title"
      className="flex h-[clamp(360px,calc(100vh-330px),600px)] min-h-0 w-full flex-col overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/95 shadow-[0_14px_38px_rgba(30,41,59,0.08)]"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">Conversation</p>
          <h2 id="live-transcription-title" className="mt-0.5 truncate text-[16px] font-extrabold text-slate-900">
            Live Transcription
          </h2>
        </div>
        <span
          aria-live="polite"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusPresentation.badgeClassName}`}
        >
          <i aria-hidden="true" className={`size-1.5 rounded-full ${statusPresentation.dotClassName}`} />
          {statusPresentation.label}
        </span>
      </header>

      <div
        ref={scrollAreaRef}
        aria-label="Live conversation transcript"
        onScroll={(event) => {
          const scrollArea = event.currentTarget;
          const distanceFromBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
          shouldFollowRef.current = distanceFromBottom <= nearBottomThreshold;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
      >
        {hasTranscript ? (
          <div className="space-y-4">
            <div role="log" aria-live="polite" aria-relevant="additions" className="space-y-4">
              {finalizedSegments.map((segment) => (
                <article key={segment.id} className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3">
                  <time className="pt-0.5 font-mono text-[10px] font-medium tabular-nums text-slate-400">
                    {formatTimestamp?.(segment.timestampMs) ?? ""}
                  </time>
                  <p className="text-[14px] leading-6 text-slate-800">{segment.text}</p>
                </article>
              ))}
            </div>

            {interimTranscript.trim() && (
              <div aria-live="off" className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3" data-interim-transcript>
                <time className="pt-0.5 font-mono text-[10px] font-medium text-slate-300">now</time>
                <p className="text-[14px] italic leading-6 text-slate-400">{interimTranscript.trim()}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid min-h-full place-items-center px-5 py-10 text-center">
            <div>
              <span aria-hidden="true" className="mx-auto mb-3 block size-2 rounded-full bg-indigo-300 shadow-[0_0_0_7px_rgba(165,180,252,0.18)]" />
              <p className="text-[14px] font-semibold text-slate-500">Start speaking to see the live transcript.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
