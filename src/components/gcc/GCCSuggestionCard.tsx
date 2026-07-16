"use client";

import { Check, X } from "lucide-react";
import SlideAction from "@/components/gcc/SlideAction";

export type GCCDemoSuggestionKind = "billing" | "protocol" | "detected";
export type GCCDemoSuggestionExit = "approved" | "ignored" | null;

type Props = {
  id: string;
  kind: GCCDemoSuggestionKind;
  message: string;
  exitState: GCCDemoSuggestionExit;
  onApprove: (id: string) => void;
  onIgnore: (id: string) => void;
};

export default function GCCSuggestionCard({
  id,
  kind,
  message,
  exitState,
  onApprove,
  onIgnore,
}: Props) {
  if (kind === "protocol") {
    return (
      <article
        data-demo-exit={exitState || undefined}
        className="gcc-demo-suggestion rounded-[22px] bg-gradient-to-br from-[#5e6cf0] via-[#50c8cf] to-[#78ee31] p-[2px] shadow-[0_10px_24px_rgba(48,105,151,0.14)]"
      >
        <div className="min-h-[140px] rounded-[20px] bg-white px-5 py-6 sm:px-6">
          <span className="inline-flex rounded-full bg-[#071bc7] px-3 py-1 text-[12px] font-bold leading-5 text-white">
            Protocol Ask
          </span>
          <p dir="auto" className="mt-3 text-[16px] leading-[1.5] text-[#202128]">
            “{message}”
          </p>
        </div>
      </article>
    );
  }

  const label = kind === "billing" ? "Billing" : "Detected";
  const approved = exitState === "approved";

  return (
    <article
      data-demo-exit={exitState || undefined}
      className="gcc-demo-suggestion relative min-h-[170px] py-1"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex rounded-lg border border-[#9da7ff] bg-white/80 px-2 py-0.5 text-[12px] font-medium leading-5 text-[#5c606d]">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onIgnore(id)}
          disabled={Boolean(exitState)}
          aria-label={`Ignore ${label.toLowerCase()} suggestion`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-[14px] font-semibold text-[#33364f] transition hover:bg-white hover:text-[#071bc7] active:scale-95 disabled:pointer-events-none disabled:opacity-0"
        >
          <X className="size-5" strokeWidth={2} aria-hidden="true" />
          Ignore
        </button>
      </div>

      <p dir="auto" className="mt-3 text-[16px] leading-[1.45] text-[#202128]">
        {message}
      </p>

      <SlideAction
        label="Slide to Approve"
        completedLabel="Approved"
        completed={approved}
        disabled={Boolean(exitState) && !approved}
        onComplete={() => onApprove(id)}
        className="mt-4 w-full max-w-[322px]"
      />

      {approved && (
        <span className="gcc-approval-burst pointer-events-none absolute end-3 top-2 grid size-9 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_0_0_8px_rgba(52,211,153,0.14)]" aria-hidden="true">
          <Check className="size-5" strokeWidth={2.5} />
        </span>
      )}
    </article>
  );
}
