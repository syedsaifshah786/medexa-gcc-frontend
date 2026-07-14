"use client";

import { AlertTriangle, CheckCircle2, FileSearch } from "lucide-react";
import SlideAction from "@/components/gcc/SlideAction";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import { GCC_LOCALE_TAGS } from "@/lib/i18n/formatters";
import type { GCCClaimReadiness } from "@/types/gcc-live-insights";

type Props = {
  readiness: GCCClaimReadiness | null;
  isAnalyzing?: boolean;
  onImprove?: () => void;
};

export default function GCCClaimReadinessCard({ readiness, isAnalyzing = false, onImprove }: Props) {
  const { locale, t, formatNumber } = useGCCLocale();
  const hasBlockingIssues = Boolean(readiness?.blockingIssues);
  const hasWarnings = Boolean(readiness?.warnings);
  const hasIssues = hasBlockingIssues || hasWarnings;
  const Icon = hasIssues ? AlertTriangle : readiness ? CheckCircle2 : FileSearch;
  const totalIssues = (readiness?.blockingIssues ?? 0) + (readiness?.warnings ?? 0);
  const issuePlural = new Intl.PluralRules(GCC_LOCALE_TAGS[locale]).select(totalIssues);
  const issuePluralForm = issuePlural === "one" || issuePlural === "two" ? issuePlural : "other";
  const readinessMessage = !readiness
    ? t("session.claimReadiness.evaluating")
    : readiness.summary.trim()
      ? readiness.summary
      : totalIssues > 0
        ? t(`session.claimReadiness.issues.${issuePluralForm}`, {
            count: formatNumber(totalIssues),
          })
        : t("session.claimReadiness.noIssues");

  return (
    <aside
      aria-label={t("session.claimReadiness.aria")}
      className={`relative overflow-hidden rounded-[25px] border px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.15)] sm:px-8 sm:py-6 ${
        hasIssues
          ? "border-cyan-400/80 bg-[#090c3b] text-white ring-1 ring-lime-300/70"
          : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-slate-900"
      }`}
    >
      <div className={`pointer-events-none absolute -end-10 -top-16 size-40 rounded-full blur-3xl ${hasIssues ? "bg-indigo-400/20" : "bg-emerald-200/45"}`} aria-hidden="true" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={`inline-flex items-center gap-2 text-[16px] font-medium sm:text-[18px] ${hasIssues ? "text-white" : "text-slate-800"}`}>
            <i className={`size-2 rounded-full ${hasBlockingIssues ? "bg-rose-400" : hasWarnings ? "bg-amber-400" : "bg-emerald-500"}`} aria-hidden="true" />
            {t("session.claimReadiness.title")}
          </h3>
          {isAnalyzing && (
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${hasIssues ? "text-indigo-200" : "text-emerald-700"}`}>
              <i className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
              {t("session.claimReadiness.analyzing")}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-start gap-3">
          <Icon className={`mt-1 size-[18px] shrink-0 ${hasBlockingIssues ? "text-rose-300" : hasWarnings ? "text-amber-300" : "text-emerald-600"}`} aria-hidden="true" />
          <p dir="auto" className={`text-[15px] leading-6 sm:text-[17px] sm:leading-7 ${hasIssues ? "text-indigo-50" : "text-slate-600"}`}>{readinessMessage}</p>
        </div>

        {readiness && hasIssues && (
          <div className="mt-3 flex flex-wrap gap-2 ps-[30px]">
            {readiness.blockingIssues > 0 && (
              <span className="rounded-full bg-rose-400/15 px-2.5 py-1 text-[10px] font-bold text-rose-100">
                {t("session.claimReadiness.blocking", {
                  count: formatNumber(readiness.blockingIssues),
                })}
              </span>
            )}
            {readiness.warnings > 0 && (
              <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold text-amber-100">
                {t(
                  readiness.warnings === 1
                    ? "session.claimReadiness.warning.one"
                    : "session.claimReadiness.warning.other",
                  { count: formatNumber(readiness.warnings) },
                )}
              </span>
            )}
          </div>
        )}

        {hasIssues && onImprove && (
          <SlideAction
            label={t("session.claimReadiness.slideImprove")}
            completedLabel={t("session.claimReadiness.issueInView")}
            variant="dark"
            onComplete={onImprove}
            className="mt-5 w-full max-w-[322px]"
          />
        )}
      </div>
    </aside>
  );
}
