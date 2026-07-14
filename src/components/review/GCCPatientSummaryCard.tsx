"use client";

import { useState } from "react";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { GCCPatientSummary } from "@/lib/gcc/session-api";

type GCCPatientSummaryCardProps = {
  patientSummary: GCCPatientSummary | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  completed: boolean;
};

type PatientSummaryDraft = {
  source: GCCPatientSummary | null;
  isEditing: boolean;
  intro: string;
  keyImprovement: string;
  performanceSummary: string;
  closingMessage: string;
};

function createPatientSummaryDraft(source: GCCPatientSummary | null): PatientSummaryDraft {
  return {
    source,
    isEditing: false,
    intro: source?.intro ?? "",
    keyImprovement: source?.key_improvement ?? "",
    performanceSummary: source?.performance_summary ?? "",
    closingMessage: source?.closing_message ?? "",
  };
}

export default function GCCPatientSummaryCard({ patientSummary, isLoading, errorMessage, onRetry, completed }: GCCPatientSummaryCardProps) {
  const { formatDate, formatNumber, t } = useGCCLocale();
  const [draft, setDraft] = useState<PatientSummaryDraft>(() => createPatientSummaryDraft(patientSummary));
  const activeDraft = draft.source === patientSummary ? draft : createPatientSummaryDraft(patientSummary);
  const { closingMessage, intro, isEditing, keyImprovement, performanceSummary } = activeDraft;
  const hasData = Boolean(patientSummary);

  return (
    <GCCReviewCardFrame title={t("review.summary.cardTitle")} isEditing={isEditing} onEditToggle={() => setDraft({ ...activeDraft, isEditing: !isEditing })} minHeightClass="min-h-[700px]" editDisabled={!hasData}>
      {isLoading ? (
        <ReviewLoadingState />
      ) : errorMessage ? (
        <ReviewErrorState message={errorMessage} onRetry={onRetry} />
      ) : !patientSummary ? (
        <ReviewEmptyState />
      ) : (
        <div className="space-y-6">
          {(intro || isEditing) && (
            isEditing ? (
              <textarea value={intro} onChange={(event) => setDraft({ ...activeDraft, intro: event.target.value })} aria-label={t("review.summary.introInputAria")} dir="auto" className="min-h-[132px] w-full resize-none rounded-[16px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[16px] font-medium leading-8 text-[#212332] outline-none focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10" />
            ) : (
              <p dir="auto" className="text-[16px] font-medium leading-8 text-[#212332]">{intro}</p>
            )
          )}

          {(patientSummary.session_number !== null || patientSummary.total_sessions !== null) && (
            <div className="rounded-[16px] border border-[#D8DDF2] bg-white/80 p-4 text-[15px] font-semibold text-[#080B3A]">
              {patientSummary.session_number !== null && patientSummary.total_sessions !== null
                ? t("review.summary.sessionProgress", {
                    current: formatNumber(patientSummary.session_number),
                    total: formatNumber(patientSummary.total_sessions),
                  })
                : patientSummary.session_number !== null
                  ? t("review.summary.sessionCurrent", { current: formatNumber(patientSummary.session_number) })
                  : t("review.summary.sessionTotal", { total: formatNumber(patientSummary.total_sessions ?? 0) })}
            </div>
          )}

          {patientSummary.activities.length > 0 && (
            <section className="rounded-[18px] border border-[#D8DDF2] bg-[#F8FBFF] p-4">
              <h3 className="text-[16px] font-semibold text-[#080B3A]">{t("review.summary.activities")}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {patientSummary.activities.map((activity, index) => (
                  <span key={`activity-${index}`} dir="auto" className="rounded-md bg-[#ECEBFF] px-2 py-1 text-[14px] font-semibold text-[#101BD8]">
                    {activity}
                  </span>
                ))}
              </div>
            </section>
          )}

          {patientSummary.focus_areas.length > 0 && (
            <section className="rounded-[18px] border border-[#D8DDF2] bg-white/80 p-4">
              <h3 className="text-[16px] font-semibold text-[#080B3A]">{t("review.summary.focusAreas")}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {patientSummary.focus_areas.map((area, index) => (
                  <span key={`focus-${index}`} dir="auto" className="rounded-md bg-[#F5FAFF] px-2 py-1 text-[14px] font-semibold text-[#212332]">
                    {area}
                  </span>
                ))}
              </div>
            </section>
          )}

          {(keyImprovement || isEditing) && (
            <section className="rounded-[18px] border border-[#D8DDF2] bg-[#F8FBFF] p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ECEBFF] text-[#5B61F6]">
                  <TrendIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-semibold text-[#080B3A]">{t("review.summary.keyImprovement")}</h3>
                  {isEditing ? (
                    <textarea value={keyImprovement} onChange={(event) => setDraft({ ...activeDraft, keyImprovement: event.target.value })} aria-label={t("review.summary.improvementInputAria")} dir="auto" className="mt-2 min-h-[86px] w-full resize-none rounded-[12px] border border-[#D8DDF2] bg-white p-3 text-[15px] font-medium leading-7 text-[#212332] outline-none" />
                  ) : (
                    <p dir="auto" className="mt-2 text-[15px] font-medium leading-7 text-[#212332]">{keyImprovement}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {(performanceSummary || isEditing) && (
            isEditing ? (
              <textarea value={performanceSummary} onChange={(event) => setDraft({ ...activeDraft, performanceSummary: event.target.value })} aria-label={t("review.summary.performanceInputAria")} dir="auto" className="min-h-[112px] w-full resize-none rounded-[16px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[16px] font-medium leading-8 text-[#212332] outline-none focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10" />
            ) : (
              <p dir="auto" className="text-[16px] font-medium leading-8 text-[#212332]">{performanceSummary}</p>
            )
          )}

          {patientSummary.upcoming_care_plan.length > 0 && (
            <div className="border-t border-dashed border-[#C9CEE4] pt-6">
              <h3 className="text-[18px] font-semibold text-[#080B3A]">{t("review.summary.upcomingCarePlan")}</h3>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {patientSummary.upcoming_care_plan.map((item, index) => (
                  <div key={`${item.day ?? "care"}-${item.date ?? index}`} className="rounded-[16px] border border-[#C7D8F8] bg-white p-4 text-center shadow-[0_8px_18px_rgba(55,65,130,0.04)]">
                    {item.day && <p dir="auto" className="text-[13px] font-semibold text-[#697085]">{translateCarePlanDay(item.day, t)}</p>}
                    {item.date && <p className="mt-1 break-words text-[clamp(18px,5vw,32px)] font-bold leading-tight text-[#101BD8]">{formatCarePlanDate(item.date, formatDate, formatNumber)}</p>}
                    {item.label && <p dir="auto" className="mt-2 text-[13px] font-semibold text-[#697085]">{item.label}</p>}
                    <span className="mx-auto mt-2 block size-2 rounded-full bg-[#5B61F6]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(closingMessage || isEditing) && (
            isEditing ? (
              <textarea value={closingMessage} onChange={(event) => setDraft({ ...activeDraft, closingMessage: event.target.value })} aria-label={t("review.summary.closingInputAria")} dir="auto" className="min-h-[100px] w-full resize-none rounded-[16px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[16px] font-medium leading-8 text-[#212332] outline-none focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10" />
            ) : (
              <p dir="auto" className="text-[16px] font-medium leading-8 text-[#212332]">{closingMessage}</p>
            )
          )}

          {completed && (
            <div role="status" className="rounded-[18px] border border-[#BDEFCF] bg-[#F1FFF6] px-4 py-3 text-[15px] font-semibold text-[#147A44]">
              {t("review.completed")}
            </div>
          )}
        </div>
      )}
    </GCCReviewCardFrame>
  );
}

function ReviewEmptyState() {
  const { t } = useGCCLocale();

  return (
    <div className="rounded-[18px] border border-[#D8DDF2] bg-white/80 p-5">
      <p className="text-[15px] font-semibold text-[#080B3A]">{t("review.emptyTitle")}</p>
      <p className="mt-2 text-[14px] font-medium text-[#697085]">{t("review.emptyBody")}</p>
    </div>
  );
}

function ReviewErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useGCCLocale();

  return (
    <div className="rounded-[18px] border border-[#F4B5B5] bg-[#FFF8F8] p-5">
      <p className="text-[15px] font-semibold text-[#080B3A]">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 h-9 rounded-full border border-[#AEB7F7] bg-white px-4 text-[13px] font-semibold text-[#101BD8] transition hover:border-[#5B61F6]">
        {t("review.retry")}
      </button>
    </div>
  );
}

function ReviewLoadingState() {
  const { t } = useGCCLocale();

  return (
    <div className="space-y-4" role="status" aria-label={t("review.loadingAria")}>
      <p className="text-[14px] font-semibold text-[#697085]">{t("review.loadingAria")}</p>
      <div aria-hidden="true" className="h-24 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
      <div aria-hidden="true" className="h-28 animate-pulse rounded-[18px] bg-[#EEF1FA]" />
      <div aria-hidden="true" className="h-20 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
    </div>
  );
}

type Translate = ReturnType<typeof useGCCLocale>["t"];
type FormatDate = ReturnType<typeof useGCCLocale>["formatDate"];
type FormatNumber = ReturnType<typeof useGCCLocale>["formatNumber"];

function translateCarePlanDay(day: string, t: Translate) {
  const key = day.trim().toLowerCase();
  const knownDays: Record<string, string> = {
    sunday: "review.summary.day.sunday",
    monday: "review.summary.day.monday",
    tuesday: "review.summary.day.tuesday",
    wednesday: "review.summary.day.wednesday",
    thursday: "review.summary.day.thursday",
    friday: "review.summary.day.friday",
    saturday: "review.summary.day.saturday",
  };

  return knownDays[key] ? t(knownDays[key]) : day;
}

function formatCarePlanDate(value: string, formatDate: FormatDate, formatNumber: FormatNumber) {
  const trimmedValue = value.trim();
  if (/^\d+$/.test(trimmedValue)) {
    return formatNumber(Number(trimmedValue));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) || (/\d{4}/.test(trimmedValue) && !Number.isNaN(Date.parse(trimmedValue)))) {
    return formatDate(trimmedValue, { day: "numeric", month: "short", year: "numeric" });
  }

  return value;
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m4.5 15.5 5-5 3.5 3.5 6.5-7M15.5 7h4v4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}
