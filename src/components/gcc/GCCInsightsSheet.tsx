"use client";

import GCCClaimReadinessCard from "@/components/gcc/GCCClaimReadinessCard";
import GCCSuggestionCard from "@/components/gcc/GCCSuggestionCard";
import type { Suggestion } from "@/lib/mock/gcc-session";

type Props = {
  count: number;
  suggestions: Suggestion[];
  claimFocused: boolean;
  onClaimFocus: () => void;
};

export default function GCCInsightsSheet({ count, suggestions, claimFocused, onClaimFocus }: Props) {
  const ordered = claimFocused
    ? ["claim", ...suggestions.map((item) => item.id)]
    : [suggestions[0].id, suggestions[1].id, "claim", suggestions[2].id];

  return (
    <section aria-labelledby="insights-title" className="relative mx-auto w-full max-w-[620px]">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <i className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <i className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          <h2 id="insights-title" className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">Medexa is Processing for Insights...</h2>
        </div>
        <strong className="text-[9px] font-bold text-indigo-500 sm:text-[10px]">{count} Suggestions</strong>
      </div>

      <div className="gcc-insights-shell relative overflow-hidden rounded-[26px] border border-emerald-200/80 bg-[#fbfdfc]/95 shadow-[0_14px_40px_rgba(46,125,112,0.1)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(#7f86df_0.65px,transparent_0.65px)] [background-size:15px_15px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        <div className="relative flex h-8 items-center justify-center bg-white/45">
          <span className="h-1 w-12 rounded-full bg-slate-300/90" />
        </div>
        <div className="gcc-insights-scroll relative h-[510px] overflow-y-auto overscroll-contain px-3 pb-5 sm:h-[540px] sm:px-5">
          <div className="mx-auto grid w-full max-w-[510px] gap-3">
            {ordered.map((id) =>
              id === "claim" ? (
                <GCCClaimReadinessCard key={id} focused={claimFocused} onFocus={onClaimFocus} />
              ) : (
                <GCCSuggestionCard key={id} suggestion={suggestions.find((item) => item.id === id)!} />
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
