import type { TranscriptLine } from "@/lib/mock/gcc-session";

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

export default function GCCTranscript({ lines }: { lines: TranscriptLine[] }) {
  return (
    <div aria-label="Live conversation transcript" className="mx-auto mt-3 w-full max-w-[460px] space-y-2.5 text-left">
      {lines.map((line) => (
        <div key={`${line.time}-${line.speaker}`} className="grid grid-cols-[48px_minmax(0,1fr)] items-baseline gap-2">
          <time className="font-mono text-[9px] text-slate-400">{line.time}</time>
          <p className="text-[10px] leading-[1.55] text-slate-500">
            <strong className="font-bold text-slate-700">{line.speaker}:</strong>{" "}
            <HighlightedText content={line.content} highlight={line.highlight} />
          </p>
        </div>
      ))}
    </div>
  );
}
