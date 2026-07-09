"use client";

import { useState } from "react";
import type { Suggestion } from "@/lib/mock/gcc-session";

export default function GCCSuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const [approved, setApproved] = useState(false);
  const isBilling = suggestion.type === "Billing";

  return (
    <article className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_25px_rgba(50,61,105,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${isBilling ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600"}`}>
          {isBilling ? (
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path d="M7 3.5h8l3 3V20H7Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M14.5 3.5V7H18M10 11h5M10 14.5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M9.8 9a2.4 2.4 0 0 1 4.5 1.1c0 1.7-2.3 1.8-2.3 3.3M12 16.5h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <span className={`text-[9px] font-extrabold uppercase tracking-[0.16em] ${isBilling ? "text-sky-600" : "text-violet-600"}`}>{suggestion.type}</span>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-800">{suggestion.title}</p>
        </div>
      </div>

      {suggestion.detected && (
        <div className="mt-4 rounded-xl bg-emerald-50/70 p-3">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-emerald-600">Detected</span>
          <p className="mt-1 text-[11px] leading-5 text-slate-600">{suggestion.detected}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        <button type="button" className="px-2 py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600">Ignore</button>
        <button
          type="button"
          onClick={() => setApproved((value) => !value)}
          className={`relative flex h-9 w-[148px] items-center rounded-full px-1 transition ${approved ? "bg-emerald-500" : "bg-slate-100"}`}
          aria-pressed={approved}
        >
          <span className={`grid size-7 place-items-center rounded-full bg-white shadow-md transition-transform ${approved ? "translate-x-[112px] text-emerald-600" : "text-indigo-500"}`}>
            <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true"><path d="m8 12 2.5 2.5L16 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" /></svg>
          </span>
          <span className={`absolute inset-0 grid place-items-center pl-5 text-[10px] font-bold ${approved ? "pr-5 text-white" : "text-slate-500"}`}>
            {approved ? "Approved" : "Slide to Approve"}
          </span>
        </button>
      </div>
    </article>
  );
}
