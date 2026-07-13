import type { TranscriptLine } from "@/lib/mock/gcc-session";
import type { TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";

function HighlightedText({ content, highlight }: Pick<TranscriptLine, "content" | "highlight">) {
  if (!highlight) return content;

  const phrases = typeof highlight === "string" ? [highlight] : highlight;
  const escapedPhrases = phrases.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = content.split(new RegExp(`(${escapedPhrases.join("|")})`, "gi"));

  return parts.map((part, index) =>
    phrases.some((phrase) => phrase.toLowerCase() === part.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        className="box-decoration-clone rounded bg-slate-700 px-1 py-0.5 font-medium text-slate-50"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function GCCTranscript({
  lines = [],
  segments = [],
  interimTranscript = "",
  formatTimestamp,
}: {
  lines?: TranscriptLine[];
  segments?: TranscriptSegment[];
  interimTranscript?: string;
  formatTimestamp?: (timestampMs: number) => string;
}) {
  const hasLiveTranscript = segments.length > 0 || interimTranscript;

  return (
    <div aria-label="Live conversation transcript" className="mt-3 w-full space-y-2 text-left">
      {hasLiveTranscript ? (
        <>
          {segments.map((segment) => (
            <div key={segment.id} className="grid grid-cols-[40px_minmax(0,1fr)] items-baseline gap-1.5">
              <time className="font-mono text-[8px] text-slate-400">{formatTimestamp?.(segment.timestampMs) ?? ""}</time>
              <p className="text-[9px] leading-[1.5] text-slate-500">
                <strong className="font-bold text-slate-700">Live:</strong> {segment.text}
              </p>
            </div>
          ))}
          {interimTranscript && (
            <div className="grid grid-cols-[40px_minmax(0,1fr)] items-baseline gap-1.5">
              <time className="font-mono text-[8px] text-slate-300">now</time>
              <p className="text-[9px] italic leading-[1.5] text-slate-400">
                <strong className="font-bold text-slate-500">Live:</strong> {interimTranscript}...
              </p>
            </div>
          )}
        </>
      ) : (
        lines.map((line) => (
          <div key={`${line.time}-${line.speaker}`} className="grid grid-cols-[40px_minmax(0,1fr)] items-baseline gap-1.5">
            <time className="font-mono text-[8px] text-slate-400">{line.time}</time>
            <p className="text-[9px] leading-[1.5] text-slate-500">
              <strong className="font-bold text-slate-700">{line.speaker}:</strong>{" "}
              <HighlightedText content={line.content} highlight={line.highlight} />
            </p>
          </div>
        ))
      )}
    </div>
  );
}
