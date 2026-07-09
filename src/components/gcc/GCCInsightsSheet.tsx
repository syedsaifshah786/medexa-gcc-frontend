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
    <section aria-labelledby="insights-title" className="relative mx-auto w-full max-w-[660px]">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <div className="flex min-w-0 items-center">
          <h2 id="insights-title" className="truncate text-[9px] font-semibold text-slate-500">Medexa is Processing for Insights...</h2>
        </div>
        <strong className="shrink-0 text-[9px] font-bold text-indigo-500">{count} Suggestions</strong>
      </div>

      <div className="gcc-insights-shell relative overflow-hidden rounded-[22px] border border-emerald-200/80 bg-[#fbfdfc]/95 shadow-[0_12px_34px_rgba(46,125,112,0.1)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(#7f86df_0.65px,transparent_0.65px)] [background-size:15px_15px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        <div className="relative flex h-7 items-center justify-center bg-white/45">
          <span className="h-1 w-10 rounded-full bg-slate-300/90" />
        </div>
        <div className="gcc-insights-scroll relative h-[500px] overflow-y-auto overscroll-contain px-3 pb-4 sm:px-5">
          <div className="mx-auto grid w-full max-w-[620px] gap-2.5">
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
