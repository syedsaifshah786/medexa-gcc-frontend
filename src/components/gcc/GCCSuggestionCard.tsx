"use client";

import { Check, X } from "lucide-react";
import SlideAction from "@/components/gcc/SlideAction";
import type { GCCLiveSuggestion, GCCLiveSuggestionCategory } from "@/types/gcc-live-insights";

const categoryLabels: Record<GCCLiveSuggestionCategory, string> = {
  protocol_question: "Protocol question",
  clinical_prompt: "Clinical prompt",
  documentation: "Documentation",
  billing: "Billing review",
  compliance: "Compliance",
  safety: "Safety",
};

const categoryTones: Record<GCCLiveSuggestionCategory, string> = {
  protocol_question: "border-violet-200 bg-violet-50 text-violet-700",
  clinical_prompt: "border-indigo-200 bg-indigo-50 text-indigo-700",
  documentation: "border-sky-200 bg-sky-50 text-sky-700",
  billing: "border-cyan-200 bg-cyan-50 text-cyan-700",
  compliance: "border-amber-200 bg-amber-50 text-amber-700",
  safety: "border-rose-200 bg-rose-50 text-rose-700",
};

const priorityTones: Record<GCCLiveSuggestion["priority"], string> = {
  low: "bg-slate-300",
  medium: "bg-amber-400",
  high: "bg-rose-500",
};

type Props = {
  suggestion: GCCLiveSuggestion;
  onApprove: (fingerprint: string) => void;
  onIgnore: (fingerprint: string) => void;
};

export default function GCCSuggestionCard({ suggestion, onApprove, onIgnore }: Props) {
  const approved = suggestion.status === "approved";
  const exiting = suggestion.status === "ignored" || suggestion.status === "resolved";

  return (
    <article
      data-suggestion-status={suggestion.status}
      aria-hidden={exiting || undefined}
      className={`gcc-live-suggestion rounded-[14px] border border-slate-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(37,48,93,0.06)] transition duration-300 sm:p-4 ${exiting ? "pointer-events-none" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.09em] ${categoryTones[suggestion.category]}`}>
            <i className={`size-1.5 rounded-full ${priorityTones[suggestion.priority]}`} aria-hidden="true" />
            {categoryLabels[suggestion.category]}
          </span>
          <span className="text-[10px] font-semibold capitalize text-slate-400">{suggestion.priority} priority</span>
        </div>

        {approved ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
            <Check className="size-3.5" aria-hidden="true" />
            Approved
          </span>
        ) : suggestion.status === "active" ? (
          <button
            type="button"
            onClick={() => onIgnore(suggestion.fingerprint)}
            aria-label={`Ignore ${suggestion.title}`}
            title="Ignore suggestion"
            className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
          >
            <X className="size-3.5" aria-hidden="true" />
            Ignore
          </button>
        ) : (
          <span className="shrink-0 text-[11px] font-bold text-slate-400">Ignored</span>
        )}
      </div>

      <h3 className="mt-3 text-[15px] font-extrabold leading-5 text-slate-800">{suggestion.title}</h3>
      {suggestion.message && suggestion.message !== suggestion.title && (
        <p className="mt-1.5 text-[13px] leading-5 text-slate-600">{suggestion.message}</p>
      )}

      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Transcript evidence</span>
        <p className="mt-1 text-[12px] leading-[1.55] text-slate-600">&ldquo;{suggestion.evidence}&rdquo;</p>
      </div>

      {suggestion.actionLabel && (
        <p className="mt-2.5 text-[11px] font-semibold text-indigo-700">Suggested action: {suggestion.actionLabel}</p>
      )}

      <SlideAction
        label="Slide to Approve"
        completedLabel="Approved"
        completed={approved}
        disabled={suggestion.status !== "active"}
        onComplete={() => onApprove(suggestion.fingerprint)}
        className="mt-3 w-full max-w-[260px]"
      />
    </article>
  );
}
