"use client";

import { useState, type ReactNode } from "react";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { GCCPatientSummary } from "@/lib/gcc/session-api";

type GCCPatientSummaryCardProps = {
  patientSummary: GCCPatientSummary | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
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
    intro: source?.intro || source?.summary || "",
    keyImprovement: source?.keyImprovement ?? "",
    performanceSummary: source?.performanceSummary ?? "",
    closingMessage: source?.closingMessage ?? "",
  };
}

export default function GCCPatientSummaryCard({ patientSummary, isLoading, errorMessage, onRetry }: GCCPatientSummaryCardProps) {
  const { formatDate, formatNumber, t } = useGCCLocale();
  const [draft, setDraft] = useState<PatientSummaryDraft>(() => createPatientSummaryDraft(patientSummary));
  const activeDraft = draft.source === patientSummary ? draft : createPatientSummaryDraft(patientSummary);
  const { closingMessage, intro, isEditing, keyImprovement, performanceSummary } = activeDraft;
  const hasData = Boolean(patientSummary);
  const isPrototypeLayout = Boolean(patientSummary?.sessionDetailsPrefix && patientSummary.sessionDetailsSuffix);
  const sessionPhrase = patientSummary && patientSummary.sessionNumber !== null && patientSummary.totalSessions !== null
    ? `Session ${patientSummary.sessionNumber} of ${patientSummary.totalSessions}`
    : "";
  const improvementHighlight = keyImprovement.match(/\bwith\s+(.+?)(?=\.$|$)/i)?.[1] ?? "";

  return (
    <GCCReviewCardFrame
      title={patientSummary?.sectionTitle ?? t("review.summary.cardTitle")}
      isEditing={isEditing}
      onEditToggle={() => setDraft({ ...activeDraft, isEditing: !isEditing })}
      minHeightClass="min-h-[700px]"
      editDisabled={!hasData}
    >
      {isLoading ? (
        <ReviewLoadingState />
      ) : errorMessage ? (
        <ReviewErrorState message={errorMessage} onRetry={onRetry} />
      ) : !patientSummary ? (
        <ReviewEmptyState />
      ) : (
        <div className="space-y-6">
          {isEditing ? (
            <textarea
              value={intro}
              onChange={(event) => setDraft({ ...activeDraft, intro: event.target.value })}
              aria-label={t("review.summary.introInputAria")}
              dir="auto"
              className="min-h-[104px] w-full resize-none rounded-[15px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[15px] leading-6 text-[#30323a] outline-none focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10"
            />
          ) : (
            <p dir="auto" className="text-[15px] leading-[1.55] text-[#344057]">
              <HighlightedText text={intro} highlight={sessionPhrase} strong />
            </p>
          )}

          {isPrototypeLayout ? (
            <p dir="auto" className="text-[15px] leading-[1.55] text-[#344057]">
              {patientSummary.sessionDetailsPrefix}{" "}
              {patientSummary.activities.map((activity, index) => (
                <span key={activity}>
                  <span className="rounded bg-[#edf0ff] px-1 text-[#3948e8]">{activity}</span>
                  {index < patientSummary.activities.length - 1 ? " and " : " "}
                </span>
              ))}
              {patientSummary.sessionDetailsSuffix}
            </p>
          ) : (
            <FallbackSessionDetails patientSummary={patientSummary} />
          )}

          {(keyImprovement || isEditing) && (
            <section className="rounded-[18px] border border-[#cad8fa] bg-white/85 px-5 py-4">
              <h3 className="text-[15px] font-semibold text-[#080B3A]">{patientSummary.keyImprovementTitle ?? t("review.summary.keyImprovement")}</h3>
              {isEditing ? (
                <textarea
                  value={keyImprovement}
                  onChange={(event) => setDraft({ ...activeDraft, keyImprovement: event.target.value })}
                  aria-label={t("review.summary.improvementInputAria")}
                  dir="auto"
                  className="mt-2 min-h-[74px] w-full resize-none rounded-[12px] border border-[#D8DDF2] bg-white p-3 text-[15px] leading-6 text-[#30323a] outline-none"
                />
              ) : (
                <p dir="auto" className="mt-1 text-[15px] leading-6 text-[#30323a]">
                  <HighlightedText text={keyImprovement} highlight={improvementHighlight} />
                </p>
              )}
            </section>
          )}

          {isEditing ? (
            <textarea
              value={performanceSummary}
              onChange={(event) => setDraft({ ...activeDraft, performanceSummary: event.target.value })}
              aria-label={t("review.summary.performanceInputAria")}
              dir="auto"
              className="min-h-[104px] w-full resize-none rounded-[15px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[15px] leading-6 text-[#30323a] outline-none focus:border-[#5B61F6]"
            />
          ) : (
            <p dir="auto" className="text-[15px] leading-[1.55] text-[#344057]">{performanceSummary}</p>
          )}

          {patientSummary.carePlan.length > 0 && (
            <section className="border-t border-dashed border-[#D8DDF2] pt-4">
              <h3 className="text-[16px] font-semibold text-[#080B3A]">{patientSummary.upcomingCarePlanTitle ?? t("review.summary.upcomingCarePlan")}</h3>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {patientSummary.carePlan.map((item, index) => (
                  <div key={`${item.day ?? "care"}-${item.date ?? index}`} className="rounded-[15px] border border-[#C7D8F8] bg-[#fbfdff] px-3 py-3 text-center">
                    {item.day && <p dir="auto" className="text-[13px] font-medium text-[#080B3A]">{isPrototypeLayout ? item.day : translateCarePlanDay(item.day, t)}</p>}
                    {item.date && <p className="mt-1 text-[23px] font-semibold leading-none text-[#101BD8]">{isPrototypeLayout ? item.date : formatCarePlanDate(item.date, formatDate, formatNumber)}</p>}
                    <span className="mx-auto mt-3 block size-2 rounded-full bg-[#5B61F6]" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {isEditing ? (
            <textarea
              value={closingMessage}
              onChange={(event) => setDraft({ ...activeDraft, closingMessage: event.target.value })}
              aria-label={t("review.summary.closingInputAria")}
              dir="auto"
              className="min-h-[76px] w-full resize-none rounded-[14px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[15px] text-[#30323a] outline-none"
            />
          ) : (
            <p dir="auto" className="text-center text-[15px] text-[#24252b]">{closingMessage}</p>
          )}
        </div>
      )}
    </GCCReviewCardFrame>
  );
}

function HighlightedText({ text, highlight, strong = false }: { text: string; highlight: string; strong?: boolean }) {
  if (!highlight || !text.includes(highlight)) return text;
  const [before, ...afterParts] = text.split(highlight);
  const highlighted: ReactNode = strong
    ? <strong className="font-semibold text-[#171924]">{highlight}</strong>
    : <span className="text-[#3948e8]">{highlight}</span>;
  return <>{before}{highlighted}{afterParts.join(highlight)}</>;
}

function FallbackSessionDetails({ patientSummary }: { patientSummary: GCCPatientSummary }) {
  if (!patientSummary.activities.length && !patientSummary.focusAreas.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {[...patientSummary.activities, ...patientSummary.focusAreas].map((item, index) => (
        <span key={`${item}-${index}`} dir="auto" className="rounded-md bg-[#ECEBFF] px-2 py-1 text-[14px] font-semibold text-[#101BD8]">{item}</span>
      ))}
    </div>
  );
}

function ReviewEmptyState() {
  const { t } = useGCCLocale();
  return <div className="rounded-[18px] border border-[#D8DDF2] bg-white/80 p-5"><p className="text-[15px] font-semibold text-[#080B3A]">{t("review.emptyTitle")}</p><p className="mt-2 text-[14px] text-[#697085]">{t("review.emptyBody")}</p></div>;
}

function ReviewErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useGCCLocale();
  return <div className="rounded-[18px] border border-[#F4B5B5] bg-[#FFF8F8] p-5"><p className="text-[15px] font-semibold text-[#080B3A]">{message}</p><button type="button" onClick={onRetry} className="mt-4 h-9 rounded-full border border-[#AEB7F7] bg-white px-4 text-[13px] font-semibold text-[#101BD8]">{t("review.retry")}</button></div>;
}

function ReviewLoadingState() {
  const { t } = useGCCLocale();
  return <div className="space-y-4" role="status" aria-label={t("review.loadingAria")}><div className="h-24 animate-pulse rounded-[16px] bg-[#EEF1FA]" /><div className="h-28 animate-pulse rounded-[18px] bg-[#EEF1FA]" /></div>;
}

type Translate = ReturnType<typeof useGCCLocale>["t"];
type FormatDate = ReturnType<typeof useGCCLocale>["formatDate"];
type FormatNumber = ReturnType<typeof useGCCLocale>["formatNumber"];

function translateCarePlanDay(day: string, t: Translate) {
  const key = day.trim().toLowerCase();
  const knownDays: Record<string, string> = {
    sunday: "review.summary.day.sunday", monday: "review.summary.day.monday", tuesday: "review.summary.day.tuesday",
    wednesday: "review.summary.day.wednesday", thursday: "review.summary.day.thursday", friday: "review.summary.day.friday", saturday: "review.summary.day.saturday",
  };
  return knownDays[key] ? t(knownDays[key]) : day;
}

function formatCarePlanDate(value: string, formatDate: FormatDate, formatNumber: FormatNumber) {
  const trimmedValue = value.trim();
  if (/^\d+$/.test(trimmedValue)) return formatNumber(Number(trimmedValue));
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) || (/\d{4}/.test(trimmedValue) && !Number.isNaN(Date.parse(trimmedValue)))) {
    return formatDate(trimmedValue, { day: "numeric", month: "short", year: "numeric" });
  }
  return value;
}
