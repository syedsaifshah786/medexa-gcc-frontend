"use client";

import { Check, X } from "lucide-react";
import SlideAction from "@/components/gcc/SlideAction";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { GCCLiveSuggestion, GCCLiveSuggestionCategory } from "@/types/gcc-live-insights";

export type GCCDemoSuggestionKind = "billing" | "protocol" | "detected";
export type GCCDemoSuggestionExit = "approved" | "ignored" | null;

type Props = {
  suggestion: GCCLiveSuggestion;
  exitState: GCCDemoSuggestionExit;
  onApprove: (fingerprint: string) => void;
  onIgnore: (fingerprint: string) => void;
};

function categoryKey(category: GCCLiveSuggestionCategory) {
  const keys: Record<GCCLiveSuggestionCategory, string> = {
    protocol_question: "session.suggestion.category.protocolQuestion",
    clinical_prompt: "session.suggestion.category.clinicalPrompt",
    documentation: "session.suggestion.category.documentation",
    billing: "session.suggestion.category.billing",
    compliance: "session.suggestion.category.compliance",
    safety: "session.suggestion.category.safety",
  };
  return keys[category];
}

export default function GCCSuggestionCard({ suggestion, exitState, onApprove, onIgnore }: Props) {
  const { t } = useGCCLocale();
  const isProtocol = suggestion.category === "protocol_question";
  const approved = exitState === "approved" || suggestion.status === "approved";
  const label = t(categoryKey(suggestion.category));

  return (
    <article
      data-demo-exit={exitState || undefined}
      className={isProtocol
        ? "gcc-demo-suggestion rounded-[22px] bg-gradient-to-br from-[#5e6cf0] via-[#50c8cf] to-[#78ee31] p-[2px] shadow-[0_10px_24px_rgba(48,105,151,0.14)]"
        : "gcc-demo-suggestion relative min-h-[190px] py-1"}
    >
      <div className={isProtocol ? "relative min-h-[190px] rounded-[20px] bg-white px-5 py-6 sm:px-6" : "relative"}>
        <div className="flex items-center justify-between gap-4">
          <span className={isProtocol
            ? "inline-flex rounded-full bg-[#071bc7] px-3 py-1 text-[12px] font-bold leading-5 text-white"
            : "inline-flex rounded-lg border border-[#9da7ff] bg-white/80 px-2 py-0.5 text-[12px] font-medium leading-5 text-[#5c606d]"}
          >
            {label}
          </span>
          <button type="button" onClick={() => onIgnore(suggestion.fingerprint)} disabled={Boolean(exitState)} aria-label={t("session.suggestion.ignoreAria", { title: suggestion.title })} className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-[14px] font-semibold text-[#33364f] transition hover:bg-slate-50 hover:text-[#071bc7] active:scale-95 disabled:pointer-events-none disabled:opacity-0">
            <X className="size-5" strokeWidth={2} aria-hidden="true" />
            {t("session.suggestion.ignore")}
          </button>
        </div>

        <h3 dir="auto" className="mt-3 text-[15px] font-bold text-[#171b32]">{suggestion.title}</h3>
        <p dir="auto" className="mt-1.5 text-[15px] leading-[1.5] text-[#202128]">{suggestion.message}</p>
        <blockquote dir="auto" className="mt-3 rounded-xl bg-indigo-50/70 px-3 py-2 text-[12px] leading-5 text-indigo-800">
          {t("session.suggestion.evidenceQuote", { evidence: suggestion.evidence })}
        </blockquote>

        <SlideAction label={t("session.suggestion.slideApprove")} completedLabel={t("session.suggestion.approved")} completed={approved} disabled={Boolean(exitState) && !approved} onComplete={() => onApprove(suggestion.fingerprint)} className="mt-4 w-full max-w-[322px]" />

        {approved && (
          <span className="gcc-approval-burst pointer-events-none absolute end-3 top-2 grid size-9 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_0_0_8px_rgba(52,211,153,0.14)]" aria-hidden="true">
            <Check className="size-5" strokeWidth={2.5} />
          </span>
        )}
      </div>
    </article>
  );
}
