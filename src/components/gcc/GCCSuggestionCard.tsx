"use client";

import { Check, X } from "lucide-react";
import SlideAction from "@/components/gcc/SlideAction";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { GCCLiveSuggestion, GCCLiveSuggestionCategory } from "@/types/gcc-live-insights";

const categoryKeys: Record<GCCLiveSuggestionCategory, string> = {
  protocol_question: "session.suggestion.category.protocolQuestion",
  clinical_prompt: "session.suggestion.category.clinicalPrompt",
  documentation: "session.suggestion.category.documentation",
  billing: "session.suggestion.category.billing",
  compliance: "session.suggestion.category.compliance",
  safety: "session.suggestion.category.safety",
};

const categoryTones: Record<GCCLiveSuggestionCategory, string> = {
  protocol_question: "border-indigo-700 bg-[#1024c9] text-white",
  clinical_prompt: "border-indigo-300 bg-white text-slate-600",
  documentation: "border-indigo-300 bg-white text-slate-600",
  billing: "border-indigo-300 bg-white text-slate-600",
  compliance: "border-amber-300 bg-amber-50 text-amber-800",
  safety: "border-rose-300 bg-rose-50 text-rose-700",
};

const priorityDots: Record<GCCLiveSuggestion["priority"], string> = {
  low: "bg-sky-400",
  medium: "bg-amber-400",
  high: "bg-rose-500",
};

type Props = {
  suggestion: GCCLiveSuggestion;
  onApprove: (fingerprint: string) => void;
  onIgnore: (fingerprint: string) => void;
};

export default function GCCSuggestionCard({ suggestion, onApprove, onIgnore }: Props) {
  const { t } = useGCCLocale();
  const approved = suggestion.status === "approved";
  const exiting = suggestion.status === "ignored" || suggestion.status === "resolved";
  const highlighted =
    suggestion.category === "protocol_question" ||
    suggestion.category === "safety" ||
    suggestion.claimImpact !== "none";
  const messageDiffers = suggestion.message.trim() && suggestion.message.trim() !== suggestion.title.trim();

  return (
    <article
      data-suggestion-status={suggestion.status}
      data-claim-impact={suggestion.claimImpact}
      aria-hidden={exiting || undefined}
      className={`gcc-live-suggestion relative overflow-hidden rounded-[22px] border bg-white/95 px-4 py-4 transition duration-300 sm:px-5 sm:py-5 ${
        highlighted
          ? "border-cyan-400/80 shadow-[0_12px_32px_rgba(30,136,180,0.14),0_0_0_1px_rgba(132,204,22,0.65)]"
          : "border-white/90 shadow-[0_8px_26px_rgba(44,55,110,0.08)]"
      } ${exiting ? "pointer-events-none" : ""}`}
    >
      {highlighted && <span className="pointer-events-none absolute -end-12 -top-12 size-28 rounded-full bg-lime-200/25 blur-2xl" aria-hidden="true" />}

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none ${categoryTones[suggestion.category]}`}>
            {t(categoryKeys[suggestion.category])}
          </span>
          {(suggestion.priority === "high" || suggestion.claimImpact !== "none") && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold capitalize text-slate-500">
              <i className={`size-1.5 rounded-full ${priorityDots[suggestion.priority]}`} aria-hidden="true" />
              {suggestion.claimImpact === "blocking"
                ? t("session.suggestion.claimBlocker")
                : suggestion.claimImpact === "warning"
                  ? t("session.suggestion.claimReview")
                  : t(`session.suggestion.priority.${suggestion.priority}`)}
            </span>
          )}
        </div>

        {approved ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">
            <Check className="size-3.5" aria-hidden="true" />
            {t("session.suggestion.approved")}
          </span>
        ) : suggestion.status === "active" ? (
          <button
            type="button"
            onClick={() => onIgnore(suggestion.fingerprint)}
            aria-label={t("session.suggestion.ignoreAria", { title: suggestion.title })}
            title={t("session.suggestion.ignoreTitle")}
            className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-2 text-[12px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 active:scale-95"
          >
            <X className="size-4" aria-hidden="true" />
            {t("session.suggestion.ignore")}
          </button>
        ) : (
          <span className="shrink-0 text-[11px] font-bold text-slate-400">{t("session.suggestion.ignored")}</span>
        )}
      </div>

      <div className="relative mt-4">
        <h3 dir="auto" className="text-[15px] font-semibold leading-6 text-slate-900 sm:text-[16px]">{suggestion.title}</h3>
        {messageDiffers && <p dir="auto" className="mt-1.5 text-[13px] leading-5 text-slate-600 sm:text-[14px]">{suggestion.message}</p>}
      </div>

      {suggestion.evidence.trim() && (
        <div className="relative mt-3 border-s-2 border-indigo-200 ps-3">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-slate-400">{t("session.suggestion.grounded")}</span>
          <p dir="auto" className="mt-0.5 text-[11px] leading-[1.55] text-slate-500 sm:text-[12px]">
            {t("session.suggestion.evidenceQuote", { evidence: suggestion.evidence })}
          </p>
        </div>
      )}

      {suggestion.actionLabel && suggestion.actionLabel.trim() !== suggestion.title.trim() && (
        <p dir="auto" className="relative mt-3 text-[11px] font-semibold text-indigo-700">
          {t("session.suggestion.suggestedAction", { action: suggestion.actionLabel })}
        </p>
      )}

      <SlideAction
        label={t("session.suggestion.slideApprove")}
        completedLabel={t("session.suggestion.approved")}
        completed={approved}
        disabled={suggestion.status !== "active"}
        onComplete={() => onApprove(suggestion.fingerprint)}
        className="relative mt-4 w-full max-w-[322px]"
      />
    </article>
  );
}
