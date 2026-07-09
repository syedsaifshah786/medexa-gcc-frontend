import type { TranscriptLine } from "@/lib/mock/gcc-session";

function HighlightedText({ content, highlight }: Pick<TranscriptLine, "content" | "highlight">) {
  if (!highlight) return content;
  const [before, after] = content.split(highlight);
  return (
    <>
      {before}
      <mark className="rounded-md bg-indigo-100 px-1 py-0.5 font-medium text-indigo-800">{highlight}</mark>
      {after}
    </>
  );
}

export default function GCCTranscript({ lines }: { lines: TranscriptLine[] }) {
  return (
    <section aria-labelledby="transcript-title" className="rounded-[24px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_12px_35px_rgba(48,61,115,0.06)] sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Live capture</p>
          <h2 id="transcript-title" className="mt-1 text-base font-bold text-slate-850">Conversation transcript</h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-600">
          <i className="size-1.5 animate-pulse rounded-full bg-rose-500" /> LIVE
        </span>
      </div>
      <div className="space-y-4">
        {lines.map((line) => (
          <div key={`${line.time}-${line.speaker}`} className="grid grid-cols-[42px_1fr] gap-3 sm:grid-cols-[48px_86px_1fr]">
            <time className="pt-0.5 font-mono text-[10px] text-slate-400">{line.time}</time>
            <strong className={`text-xs ${line.speaker === "Dr. Sarah" ? "text-indigo-600" : "text-emerald-600"}`}>{line.speaker}</strong>
            <p className="col-start-2 text-xs leading-6 text-slate-600 sm:col-start-3">
              <HighlightedText content={line.content} highlight={line.highlight} />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
