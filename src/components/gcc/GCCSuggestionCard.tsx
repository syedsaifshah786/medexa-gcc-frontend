"use client";

import SlideAction from "@/components/gcc/SlideAction";
import type { Suggestion } from "@/lib/mock/gcc-session";

export default function GCCSuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const isBilling = suggestion.type === "Billing";

  return (
    <article className="rounded-[14px] border border-slate-200/75 bg-white/95 p-3 shadow-[0_5px_16px_rgba(50,61,105,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.11em] ${
            isBilling
              ? "border-sky-100 bg-sky-50 text-sky-600"
              : "border-violet-100 bg-violet-50 text-violet-600"
          }`}
        >
          <i className={`size-1 rounded-full ${isBilling ? "bg-sky-400" : "bg-violet-400"}`} />
          {suggestion.type}
        </span>
        <button type="button" className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">
          <svg viewBox="0 0 16 16" className="size-2.5" aria-hidden="true">
            <path d="m4.5 4.5 7 7m0-7-7 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
          Ignore
        </button>
      </div>

      <p className="mt-1.5 text-[10px] font-semibold leading-[1.45] text-slate-700">{suggestion.title}</p>

      <div className="mt-2 border-t border-slate-100 pt-2">
        <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[6px] font-extrabold uppercase tracking-[0.1em] text-emerald-600">
          Detected
        </span>
        <p className="mt-1 text-[8px] leading-[1.45] text-slate-500">
          {suggestion.detected ??
            (isBilling
              ? "Procedure language was detected and mapped to the active CCHI-BS workflow."
              : "No matching response captured yet. Ask during the active session.")}
        </p>
      </div>

      <div className="mt-2 flex justify-end">
        <SlideAction
          label="Slide to Approve"
          completedLabel="Approved"
          onComplete={() => undefined}
          className="w-[140px]"
        />
      </div>
    </article>
  );
}
