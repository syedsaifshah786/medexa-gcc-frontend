"use client";

import SlideAction from "@/components/gcc/SlideAction";
import type { Suggestion } from "@/lib/mock/gcc-session";

export default function GCCSuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const isBilling = suggestion.type === "Billing";

  return (
    <article className="rounded-[16px] border border-slate-200/75 bg-white/95 p-3.5 shadow-[0_6px_20px_rgba(50,61,105,0.055)]">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] ${
            isBilling
              ? "border-sky-100 bg-sky-50 text-sky-600"
              : "border-violet-100 bg-violet-50 text-violet-600"
          }`}
        >
          <i className={`size-1 rounded-full ${isBilling ? "bg-sky-400" : "bg-violet-400"}`} />
          {suggestion.type}
        </span>
        <button type="button" className="inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-[9px] font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">
          <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
            <path d="m4.5 4.5 7 7m0-7-7 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
          Ignore
        </button>
      </div>

      <p className="mt-2.5 text-[11px] font-semibold leading-[1.55] text-slate-700">{suggestion.title}</p>

      {(suggestion.detected || isBilling) && (
        <div className="mt-2.5 flex items-start gap-2 border-t border-slate-100 pt-2.5">
          <span className="mt-0.5 shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.1em] text-emerald-600">
            Detected
          </span>
          <p className="text-[9px] leading-[1.55] text-slate-500">{suggestion.detected ?? "Billing opportunity identified from the live session."}</p>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <SlideAction
          label="Slide to Approve"
          completedLabel="Approved"
          onComplete={() => undefined}
          className="w-[148px]"
        />
      </div>
    </article>
  );
}
