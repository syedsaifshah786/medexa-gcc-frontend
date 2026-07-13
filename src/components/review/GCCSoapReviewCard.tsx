"use client";

import { useEffect, useState } from "react";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import type { GCCSoapNote } from "@/lib/gcc/session-api";

type GCCSoapReviewCardProps = {
  soapNote: GCCSoapNote | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export default function GCCSoapReviewCard({ soapNote, isLoading, errorMessage, onRetry }: GCCSoapReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [history, setHistory] = useState("");
  const hasData = Boolean(soapNote);

  useEffect(() => {
    setIsEditing(false);
    setNarrative(soapNote?.subjective.patient_narrative ?? "");
    setSymptoms(soapNote?.subjective.symptoms ?? []);
    setHistory(soapNote?.subjective.history ?? "");
  }, [soapNote]);

  return (
    <GCCReviewCardFrame title="Subjective Assessment" isEditing={isEditing} onEditToggle={() => setIsEditing((value) => !value)} minHeightClass="min-h-[650px]" editDisabled={!hasData}>
      {isLoading ? (
        <ReviewLoadingState />
      ) : errorMessage ? (
        <ReviewErrorState message={errorMessage} onRetry={onRetry} />
      ) : !soapNote ? (
        <ReviewEmptyState />
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">Patient Narrative</h3>
            {soapNote.subjective.chief_complaint && <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#697085]">{soapNote.subjective.chief_complaint}</p>}
            {isEditing ? (
              <textarea
                value={narrative}
                onChange={(event) => setNarrative(event.target.value)}
                className="mt-2 min-h-[142px] w-full resize-none rounded-[15px] border border-[#C7D8F8] bg-[#F5FAFF] p-[18px] text-[15px] font-medium leading-7 text-[#212332] outline-none transition focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10"
              />
            ) : narrative ? (
              <div className="mt-2 whitespace-pre-line rounded-[15px] border border-[#C7D8F8] bg-[#F5FAFF] p-[18px] text-[15px] font-medium leading-7 text-[#212332]">
                {narrative}
              </div>
            ) : (
              <SubtleEmptyField />
            )}
          </section>

          {symptoms.length > 0 && (
            <section>
              <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">Symptoms</h3>
              <div className="mt-3 space-y-3">
                {symptoms.map((symptom, index) => (
                  <div key={`symptom-${index}`} className="flex items-center gap-3 rounded-[15px] border border-[#E0E7F6] bg-[#F8FBFF] px-4 py-3">
                    <span className="size-2.5 shrink-0 rounded-full bg-[#F4B942]" />
                    {isEditing ? (
                      <input
                        value={symptom}
                        onChange={(event) => setSymptoms((items) => items.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                        className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#212332] outline-none"
                      />
                    ) : (
                      <p className="text-[15px] font-medium text-[#212332]">{symptom}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(history || isEditing) && (
            <section>
              <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">History</h3>
              {isEditing ? (
                <textarea
                  value={history}
                  onChange={(event) => setHistory(event.target.value)}
                  className="mt-3 min-h-[100px] w-full resize-none rounded-[16px] border border-dashed border-[#AEB7F7] bg-white/80 p-4 text-[15px] font-medium leading-7 text-[#212332] outline-none transition focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10"
                />
              ) : (
                <div className="mt-3 rounded-[16px] border border-dashed border-[#AEB7F7] bg-white/80 p-4 text-[15px] font-medium leading-7 text-[#212332]">
                  {history}
                </div>
              )}
            </section>
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
      <div className="h-28 animate-pulse rounded-[15px] bg-[#EEF1FA]" />
      <div className="h-12 animate-pulse rounded-[15px] bg-[#EEF1FA]" />
      <div className="h-20 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
    </div>
  );
}

function SubtleEmptyField() {
  return <div className="mt-2 min-h-[92px] rounded-[15px] border border-[#E0E7F6] bg-white/60" aria-label="No narrative generated" />;
}
