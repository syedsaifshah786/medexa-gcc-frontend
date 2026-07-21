"use client";

import { useEffect, useState } from "react";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import { countRenderedSoapFields, hasSoapSectionData, mapSoapToViewModel } from "@/lib/review/map-soap-to-view-model";
import type { GCCSoapNote } from "@/lib/gcc/session-api";

type GCCSoapReviewCardProps = {
  soapNote: GCCSoapNote | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

type SoapDraft = {
  source: GCCSoapNote | null;
  isEditing: boolean;
  narrative: string;
  symptoms: string[];
  history: string;
};

function createSoapDraft(source: GCCSoapNote | null): SoapDraft {
  return {
    source,
    isEditing: false,
    narrative: source?.subjective.patientNarrative ?? "",
    symptoms: source?.subjective.symptoms ?? [],
    history: source?.subjective.history ?? "",
  };
}

export default function GCCSoapReviewCard({ soapNote, isLoading, errorMessage, onRetry }: GCCSoapReviewCardProps) {
  const { formatNumber, t } = useGCCLocale();
  const [draft, setDraft] = useState<SoapDraft>(() => createSoapDraft(soapNote));
  const activeDraft = draft.source === soapNote ? draft : createSoapDraft(soapNote);
  const { history, isEditing, narrative, symptoms } = activeDraft;
  const viewModel = soapNote ? mapSoapToViewModel(soapNote) : null;
  const renderedFieldCount = viewModel ? countRenderedSoapFields(viewModel) : 0;
  const hasData = renderedFieldCount > 0;

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("[GCC review] SOAP render", { soapRenderedFieldCount: renderedFieldCount });
    }
  }, [renderedFieldCount]);

  return (
    <GCCReviewCardFrame title={soapNote?.sectionTitle ?? t("review.soap.cardTitle")} isEditing={isEditing} onEditToggle={() => setDraft({ ...activeDraft, isEditing: !isEditing })} minHeightClass="min-h-[650px]" editDisabled={!hasData}>
      {isLoading ? (
        <ReviewLoadingState />
      ) : errorMessage ? (
        <ReviewErrorState message={errorMessage} onRetry={onRetry} />
      ) : !soapNote || !viewModel || !hasData ? (
        <ReviewEmptyState />
      ) : (
        <div className="space-y-6" data-soap-rendered-field-count={renderedFieldCount}>
          <section>
            <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">{soapNote.narrativeTitle ?? t("review.soap.patientNarrative")}</h3>
            {soapNote.subjective.chiefComplaint && <p dir="auto" className="mt-5 text-[15px] font-semibold text-[#080B3A]">{soapNote.subjective.chiefComplaint}</p>}
            {isEditing ? (
              <textarea
                value={narrative}
                onChange={(event) => setDraft({ ...activeDraft, narrative: event.target.value })}
                aria-label={t("review.soap.narrativeInputAria")}
                dir="auto"
                className="mt-3 min-h-[104px] w-full resize-none rounded-[15px] border border-[#C7D8F8] bg-[#F8FBFF] px-5 py-4 text-[15px] font-normal leading-6 text-[#30323a] outline-none transition focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10"
              />
            ) : narrative ? (
              <div dir="auto" className="mt-3 whitespace-pre-line rounded-[15px] border border-[#C7D8F8] bg-[#F8FBFF] px-5 py-4 text-[15px] font-normal leading-6 text-[#30323a]">
                {narrative}
              </div>
            ) : (
              <SubtleEmptyField />
            )}
          </section>

          {symptoms.length > 0 && (
            <section>
              <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">{soapNote.symptomsTitle ?? t("review.soap.symptoms")}</h3>
              <div className="mt-3 space-y-3">
                {symptoms.map((symptom, index) => (
                  <div key={`symptom-${index}`} className="flex min-h-[64px] items-center gap-3 rounded-[15px] border border-[#EEF0F5] bg-[#F7F9FB] px-5 py-3">
                    <span className="size-1.5 shrink-0 rounded-full bg-[#F4AD18]" />
                    {isEditing ? (
                      <input
                        value={symptom}
                        onChange={(event) => setDraft({ ...activeDraft, symptoms: symptoms.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)) })}
                        aria-label={t("review.soap.symptomInputAria", { index: formatNumber(index + 1) })}
                        dir="auto"
                        className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#212332] outline-none"
                      />
                    ) : (
                      <p dir="auto" className="text-[15px] font-medium text-[#212332]">{symptom}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(history || isEditing) && (
            <section>
              <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">{soapNote.historyTitle ?? t("review.soap.history")}</h3>
              {isEditing ? (
                <textarea
                  value={history}
                  onChange={(event) => setDraft({ ...activeDraft, history: event.target.value })}
                  aria-label={t("review.soap.historyInputAria")}
                  dir="auto"
                  className="mt-3 min-h-[100px] w-full resize-none rounded-[16px] border border-dashed border-[#AEB7F7] bg-white/80 p-4 text-[15px] font-medium leading-7 text-[#212332] outline-none transition focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10"
                />
              ) : (
                <div dir="auto" className="mt-3 rounded-[16px] border border-dashed border-[#AEB7F7] bg-white/80 p-4 text-[15px] font-medium leading-7 text-[#212332]">
                  {history}
                </div>
              )}
            </section>
          )}

          {hasSoapSectionData(viewModel.objective) && (
            <SoapSection title={t("review.soap.objective")} values={[
              ...viewModel.objective.observations,
              ...viewModel.objective.interventions,
              ...viewModel.objective.functionalFindings,
              ...viewModel.objective.measurements,
            ]} />
          )}

          {hasSoapSectionData(viewModel.assessment) && (
            <SoapSection title={t("review.soap.assessment")} lead={viewModel.assessment.summary} values={[
              ...viewModel.assessment.diagnoses,
              ...viewModel.assessment.functionalLimitations,
              ...viewModel.assessment.risksOrFlags,
              ...(viewModel.assessment.responseToTreatment ? [viewModel.assessment.responseToTreatment] : []),
              ...(viewModel.assessment.progress ? [viewModel.assessment.progress] : []),
            ]} />
          )}

          {hasSoapSectionData(viewModel.plan) && (
            <SoapSection title={t("review.soap.plan")} lead={viewModel.plan.followUp} values={[
              ...viewModel.plan.interventions,
              ...viewModel.plan.recommendations,
              ...viewModel.plan.homeProgram,
              ...viewModel.plan.clinicianActionsRequired,
              ...(viewModel.plan.frequency ? [viewModel.plan.frequency] : []),
            ]} />
          )}
        </div>
      )}
    </GCCReviewCardFrame>
  );
}

function SoapSection({ title, lead, values }: { title: string; lead?: string | null; values: string[] }) {
  return (
    <section data-soap-section={title.toLocaleLowerCase()}>
      <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">{title}</h3>
      {lead && <p dir="auto" className="mt-3 rounded-[15px] border border-[#C7D8F8] bg-[#F8FBFF] px-5 py-4 text-[15px] leading-6 text-[#30323a]">{lead}</p>}
      {values.length > 0 && (
        <div className="mt-3 space-y-2">
          {values.map((value, index) => (
            <p key={`${title}-${index}`} dir="auto" className="rounded-[13px] border border-[#EEF0F5] bg-[#F7F9FB] px-4 py-3 text-[14px] font-medium text-[#212332]">{value}</p>
          ))}
        </div>
      )}
    </section>
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
      <div aria-hidden="true" className="h-28 animate-pulse rounded-[15px] bg-[#EEF1FA]" />
      <div aria-hidden="true" className="h-12 animate-pulse rounded-[15px] bg-[#EEF1FA]" />
      <div aria-hidden="true" className="h-20 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
    </div>
  );
}

function SubtleEmptyField() {
  const { t } = useGCCLocale();

  return <div className="mt-2 min-h-[92px] rounded-[15px] border border-[#E0E7F6] bg-white/60" aria-label={t("review.noNarrativeAria")} />;
}
