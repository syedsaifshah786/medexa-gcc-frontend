"use client";

import GCCClaimReadinessCard from "@/components/gcc/GCCClaimReadinessCard";
import GCCSuggestionCard from "@/components/gcc/GCCSuggestionCard";
import type { Suggestion } from "@/lib/mock/gcc-session";

type Props = {
  count: number;
  suggestions: Suggestion[];
  expanded: boolean;
  claimFocused: boolean;
  onToggleExpanded: () => void;
  onClaimFocus: () => void;
};

export default function GCCInsightsSheet({ count, suggestions, expanded, claimFocused, onToggleExpanded, onClaimFocus }: Props) {
  const ordered = claimFocused
    ? ["claim", ...suggestions.map((item) => item.id)]
    : [suggestions[0].id, suggestions[1].id, "claim", suggestions[2].id];

  return (
    <section aria-labelledby="insights-title" className="relative">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <i className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <i className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <h2 id="insights-title" className="text-xs font-semibold text-slate-500">Medexa is Processing for Insights...</h2>
        </div>
        <strong className="rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] text-indigo-600">{count} Suggestions</strong>
      </div>

      <div className={`gcc-insights-shell relative overflow-hidden rounded-t-[30px] border border-emerald-200/80 bg-white/76 px-4 pb-6 pt-3 shadow-[0_-8px_50px_rgba(46,125,112,0.12)] backdrop-blur-2xl transition-all sm:px-6 ${expanded ? "max-h-[1500px]" : "max-h-[660px]"}`}>
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#7f86df_0.65px,transparent_0.65px)] [background-size:15px_15px] [mask-image:linear-gradient(to_bottom,black,transparent_55%)]" />
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-label={expanded ? "Collapse suggestions" : "Expand suggestions"}
          className="relative mx-auto mb-5 block h-1.5 w-16 rounded-full bg-slate-300 transition hover:bg-indigo-400"
        />
        <div className={`relative grid gap-4 ${expanded ? "lg:grid-cols-2" : ""}`}>
          {ordered.map((id) =>
            id === "claim" ? (
              <GCCClaimReadinessCard key={id} focused={claimFocused} onFocus={onClaimFocus} />
            ) : (
              <GCCSuggestionCard key={id} suggestion={suggestions.find((item) => item.id === id)!} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
