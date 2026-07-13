"use client";

import { useEffect, useState } from "react";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import type { GCCPatientSummary } from "@/lib/gcc/session-api";

type GCCPatientSummaryCardProps = {
  patientSummary: GCCPatientSummary | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  completed: boolean;
};

export default function GCCPatientSummaryCard({ patientSummary, isLoading, errorMessage, onRetry, completed }: GCCPatientSummaryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [intro, setIntro] = useState("");
  const [keyImprovement, setKeyImprovement] = useState("");
  const [performanceSummary, setPerformanceSummary] = useState("");
  const [closingMessage, setClosingMessage] = useState("");
  const hasData = Boolean(patientSummary);

  useEffect(() => {
    setIsEditing(false);
    setIntro(patientSummary?.intro ?? "");
    setKeyImprovement(patientSummary?.key_improvement ?? "");
    setPerformanceSummary(patientSummary?.performance_summary ?? "");
    setClosingMessage(patientSummary?.closing_message ?? "");
  }, [patientSummary]);

  return (
    <GCCReviewCardFrame title="Session Summary Note" isEditing={isEditing} onEditToggle={() => setIsEditing((value) => !value)} minHeightClass="min-h-[700px]" editDisabled={!hasData}>
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
              <textarea value={intro} onChange={(event) => setIntro(event.target.value)} className="min-h-[132px] w-full resize-none rounded-[16px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[16px] font-medium leading-8 text-[#212332] outline-none focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10" />
            ) : (
              <p className="text-[16px] font-medium leading-8 text-[#212332]">{intro}</p>
            )
          )}

          {(patientSummary.session_number !== null || patientSummary.total_sessions !== null) && (
            <div className="rounded-[16px] border border-[#D8DDF2] bg-white/80 p-4 text-[15px] font-semibold text-[#080B3A]">
              {patientSummary.session_number !== null && <span>Session {patientSummary.session_number}</span>}
              {patientSummary.session_number !== null && patientSummary.total_sessions !== null && <span> of </span>}
              {patientSummary.total_sessions !== null && <span>{patientSummary.total_sessions}</span>}
            </div>
          )}

          {patientSummary.activities.length > 0 && (
            <section className="rounded-[18px] border border-[#D8DDF2] bg-[#F8FBFF] p-4">
              <h3 className="text-[16px] font-semibold text-[#080B3A]">Activities</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {patientSummary.activities.map((activity, index) => (
                  <span key={`activity-${index}`} className="rounded-md bg-[#ECEBFF] px-2 py-1 text-[14px] font-semibold text-[#101BD8]">
                    {activity}
                  </span>
                ))}
              </div>
            </section>
          )}

          {patientSummary.focus_areas.length > 0 && (
            <section className="rounded-[18px] border border-[#D8DDF2] bg-white/80 p-4">
              <h3 className="text-[16px] font-semibold text-[#080B3A]">Focus Areas</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {patientSummary.focus_areas.map((area, index) => (
                  <span key={`focus-${index}`} className="rounded-md bg-[#F5FAFF] px-2 py-1 text-[14px] font-semibold text-[#212332]">
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
                  <h3 className="text-[16px] font-semibold text-[#080B3A]">Key Improvement</h3>
                  {isEditing ? (
                    <textarea value={keyImprovement} onChange={(event) => setKeyImprovement(event.target.value)} className="mt-2 min-h-[86px] w-full resize-none rounded-[12px] border border-[#D8DDF2] bg-white p-3 text-[15px] font-medium leading-7 text-[#212332] outline-none" />
                  ) : (
                    <p className="mt-2 text-[15px] font-medium leading-7 text-[#212332]">{keyImprovement}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {(performanceSummary || isEditing) && (
            isEditing ? (
              <textarea value={performanceSummary} onChange={(event) => setPerformanceSummary(event.target.value)} className="min-h-[112px] w-full resize-none rounded-[16px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[16px] font-medium leading-8 text-[#212332] outline-none focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10" />
            ) : (
              <p className="text-[16px] font-medium leading-8 text-[#212332]">{performanceSummary}</p>
            )
          )}

          {patientSummary.upcoming_care_plan.length > 0 && (
            <div className="border-t border-dashed border-[#C9CEE4] pt-6">
              <h3 className="text-[18px] font-semibold text-[#080B3A]">Upcoming Care Plan</h3>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {patientSummary.upcoming_care_plan.map((item, index) => (
                  <div key={`${item.day ?? "care"}-${item.date ?? index}`} className="rounded-[16px] border border-[#C7D8F8] bg-white p-4 text-center shadow-[0_8px_18px_rgba(55,65,130,0.04)]">
                    {item.day && <p className="text-[13px] font-semibold text-[#697085]">{item.day}</p>}
                    {item.date && <p className="mt-1 text-[32px] font-bold leading-9 text-[#101BD8]">{item.date}</p>}
                    {item.label && <p className="mt-2 text-[13px] font-semibold text-[#697085]">{item.label}</p>}
                    <span className="mx-auto mt-2 block size-2 rounded-full bg-[#5B61F6]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(closingMessage || isEditing) && (
            isEditing ? (
              <textarea value={closingMessage} onChange={(event) => setClosingMessage(event.target.value)} className="min-h-[100px] w-full resize-none rounded-[16px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[16px] font-medium leading-8 text-[#212332] outline-none focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10" />
            ) : (
              <p className="text-[16px] font-medium leading-8 text-[#212332]">{closingMessage}</p>
            )
          )}

          {completed && (
            <div role="status" className="rounded-[18px] border border-[#BDEFCF] bg-[#F1FFF6] px-4 py-3 text-[15px] font-semibold text-[#147A44]">
              Review completed successfully
            </div>
          )}
        </div>
      )}
    </GCCReviewCardFrame>
  );
}

function ReviewEmptyState() {
  return (
    <div className="rounded-[18px] border border-[#D8DDF2] bg-white/80 p-5">
      <p className="text-[15px] font-semibold text-[#080B3A]">No completed session data is available yet.</p>
      <p className="mt-2 text-[14px] font-medium text-[#697085]">Complete and stop a live session to generate this review.</p>
    </div>
  );
}

function ReviewErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[18px] border border-[#F4B5B5] bg-[#FFF8F8] p-5">
      <p className="text-[15px] font-semibold text-[#080B3A]">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 h-9 rounded-full border border-[#AEB7F7] bg-white px-4 text-[13px] font-semibold text-[#101BD8] transition hover:border-[#5B61F6]">
        Retry
      </button>
    </div>
  );
}

function ReviewLoadingState() {
  return (
    <div className="space-y-4" aria-label="Loading session review data">
      <div className="h-24 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
      <div className="h-28 animate-pulse rounded-[18px] bg-[#EEF1FA]" />
      <div className="h-20 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
    </div>
  );
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m4.5 15.5 5-5 3.5 3.5 6.5-7M15.5 7h4v4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}
