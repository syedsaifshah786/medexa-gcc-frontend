"use client";

import { Check } from "lucide-react";
import SlideAction from "@/components/gcc/SlideAction";
import type { GCCDemoSuggestionExit } from "@/components/gcc/GCCSuggestionCard";

type Props = {
  id: string;
  exitState: GCCDemoSuggestionExit;
  onImprove: (id: string) => void;
};

export default function GCCClaimReadinessCard({ id, exitState, onImprove }: Props) {
  const approved = exitState === "approved";

  return (
    <aside
      data-demo-exit={exitState || undefined}
      aria-label="Claim Readiness"
      className="gcc-demo-suggestion relative overflow-hidden rounded-[26px] border border-[#57de70] bg-[#090c3b] px-6 py-6 text-white shadow-[0_15px_30px_rgba(18,28,75,0.16),0_0_28px_rgba(190,242,100,0.35)] sm:px-8"
    >
      <div className="pointer-events-none absolute -end-10 -top-16 size-40 rounded-full bg-indigo-400/15 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <h3 className="inline-flex items-center gap-3 text-[17px] font-medium sm:text-[18px]">
          <i className="size-2 rounded-full bg-[#ffc21c]" aria-hidden="true" />
          Claim Readiness
        </h3>
        <p className="mt-3 max-w-[390px] text-[17px] leading-[1.5] text-[#f4f5ff]">
          2 issues found that may impact claim approval.
        </p>

        <SlideAction
          label="Slide to Improve"
          completedLabel="Improved"
          completed={approved}
          disabled={Boolean(exitState) && !approved}
          variant="dark"
          onComplete={() => onImprove(id)}
          className="mt-6 w-full max-w-[322px]"
        />
      </div>

      {approved && (
        <span className="gcc-approval-burst pointer-events-none absolute end-5 top-5 grid size-10 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_0_0_9px_rgba(52,211,153,0.14)]" aria-hidden="true">
          <Check className="size-5" strokeWidth={2.5} />
        </span>
      )}
    </aside>
  );
}
