"use client";

import SlideAction from "@/components/gcc/SlideAction";

export default function GCCClaimReadinessCard({ focused = false, onFocus }: { focused?: boolean; onFocus?: () => void }) {
  return (
    <article
      onClick={onFocus}
      className={`relative cursor-pointer overflow-hidden rounded-[17px] bg-gradient-to-br from-[#191d3b] to-[#292452] p-3.5 text-white shadow-[0_10px_28px_rgba(23,27,53,0.2)] transition ${focused ? "ring-2 ring-emerald-300/40" : ""}`}
    >
      <div className="absolute -right-8 -top-10 size-28 rounded-full bg-indigo-500/25 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-amber-400/15 text-amber-300">
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path d="M12 4 21 20H3Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" /><path d="M12 9v5M12 17h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-indigo-200">Claim Readiness</span>
          <h3 className="mt-1 text-[11px] font-bold leading-[1.5]">2 issues found that may impact claim approval.</h3>
          <p className="mt-1 text-[9px] leading-[1.5] text-slate-400">Review the documentation prompts before closing this GCC Session.</p>
        </div>
      </div>
      <SlideAction
        label="Slide to Improve"
        completedLabel="Improved"
        variant="dark"
        onComplete={() => undefined}
        className="mt-3 w-full"
      />
    </article>
  );
}
