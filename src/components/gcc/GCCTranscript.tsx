"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { SessionStatus, TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";

type GCCTranscriptProps = {
  segments?: TranscriptSegment[];
  interimTranscript?: string;
  status?: SessionStatus;
  formatTimestamp?: (timestampMs: number) => string;
  highlights?: string[];
};

type TranscriptLine = {
  speaker: string;
  text: string;
};

const nearBottomThreshold = 56;
const speakerPrefixPattern = /^\s*([\p{L}][\p{L}\p{M} .'-]{0,38}):\s*(\S[\s\S]*)$/u;

function getStatusKey(status: SessionStatus) {
  switch (status) {
    case "recording":
      return "session.transcript.status.listening";
    case "paused":
      return "session.transcript.status.paused";
    case "stopping":
      return "session.transcript.status.finalizing";
    case "starting":
      return "session.transcript.status.starting";
    case "stopped":
      return "session.transcript.status.stopped";
    case "error":
      return "session.transcript.status.unavailable";
    default:
      return "session.transcript.status.ready";
  }
}

function parseTranscriptLine(value: string, fallbackSpeaker: string): TranscriptLine {
  const text = value.trim();
  const match = text.match(speakerPrefixPattern);

  if (!match) {
    return { speaker: fallbackSpeaker, text };
  }

  return { speaker: match[1].trim(), text: match[2].trim() };
}

function HighlightedText({ text, highlights }: { text: string; highlights: string[] }) {
  const candidates = Array.from(new Set(highlights.map((highlight) => highlight.trim()).filter(Boolean))).sort(
    (left, right) => right.length - left.length,
  );

  if (!text || candidates.length === 0) return text;

  const lowerText = text.toLocaleLowerCase();
  const occupied = new Uint8Array(text.length);
  const ranges: Array<{ start: number; end: number }> = [];

  for (const candidate of candidates) {
    const lowerCandidate = candidate.toLocaleLowerCase();
    let searchFrom = 0;

    while (searchFrom < text.length) {
      const start = lowerText.indexOf(lowerCandidate, searchFrom);
      if (start === -1) break;

      const end = start + candidate.length;
      let overlaps = false;
      for (let index = start; index < end; index += 1) {
        if (occupied[index]) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        ranges.push({ start, end });
        occupied.fill(1, start, end);
      }

      searchFrom = Math.max(end, start + 1);
    }
  }

  if (ranges.length === 0) return text;

  ranges.sort((left, right) => left.start - right.start);
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(
      <mark key={`${range.start}-${range.end}`} className="rounded-[2px] bg-[#343653] px-1 py-0.5 text-white decoration-clone box-decoration-clone">
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return <Fragment>{parts}</Fragment>;
}

export default function GCCTranscript({
  segments = [],
  interimTranscript = "",
  status = "idle",
  formatTimestamp,
  highlights = [],
}: GCCTranscriptProps) {
  const { t } = useGCCLocale();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const finalizedSegments = segments.filter((segment) => segment.isFinal);
  const hasTranscript = finalizedSegments.length > 0 || Boolean(interimTranscript.trim());

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
      className={`mx-auto flex min-h-0 w-full max-w-[680px] flex-col ${
        hasTranscript ? "h-[clamp(210px,29vh,330px)]" : "h-[clamp(120px,17vh,180px)]"
      }`}
    >
      <h2 id="live-transcription-title" className="sr-only">
        {t("session.transcript.title")}
      </h2>
      <p aria-live="polite" className="sr-only">
        {t("session.transcript.status", { status: t(getStatusKey(status)) })}
      </p>

      <div
        ref={scrollAreaRef}
        aria-label={t("session.transcript.conversation")}
        onScroll={(event) => {
          const scrollArea = event.currentTarget;
          const distanceFromBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
          shouldFollowRef.current = distanceFromBottom <= nearBottomThreshold;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-3 [scrollbar-gutter:stable] sm:px-3"
      >
        <div role="log" aria-live="polite" aria-relevant="additions" className="space-y-5 sm:space-y-6">
            {finalizedSegments.map((segment) => {
              const line = segment.source === "manual-demo" && segment.speaker
                ? {
                    speaker: t(
                      segment.speaker === "clinician"
                        ? "session.liveTranscript.clinician"
                        : "session.liveTranscript.patient",
                    ),
                    text: segment.text,
                  }
                : parseTranscriptLine(segment.text, t("session.transcript.speaker.session"));
              return (
                <article key={segment.id} className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[54px_minmax(0,1fr)] sm:gap-4">
                  <time dir="ltr" className="pt-0.5 text-[12px] font-normal tabular-nums text-slate-400 sm:text-[13px]">
                    {formatTimestamp?.(segment.timestampMs) ?? ""}
                  </time>
                  <p className="min-w-0 text-[15px] leading-[1.45] text-slate-700 sm:text-[16px]">
                    <strong className="font-medium text-slate-600"><bdi>{line.speaker}</bdi>:</strong>{" "}
                    <span dir="auto"><HighlightedText text={line.text} highlights={highlights} /></span>
                  </p>
                </article>
              );
            })}

            {interimTranscript.trim() && (() => {
              const line = parseTranscriptLine(interimTranscript, t("session.transcript.speaker.live"));
              return (
                <div aria-live="off" className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[54px_minmax(0,1fr)] sm:gap-4" data-interim-transcript>
                  <time dir="ltr" className="pt-0.5 text-[12px] font-normal tabular-nums text-slate-300 sm:text-[13px]">{t("session.transcript.now")}</time>
                  <p className="min-w-0 text-[15px] italic leading-[1.45] text-slate-400 sm:text-[16px]">
                    <strong className="font-medium not-italic text-slate-500"><bdi>{line.speaker}</bdi>:</strong>{" "}
                    <span dir="auto"><HighlightedText text={line.text} highlights={highlights} /></span>
                  </p>
                </div>
              );
            })()}
        </div>
      </div>
    </section>
  );
}
