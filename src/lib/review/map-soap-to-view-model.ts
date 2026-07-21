import type { GCCSoapNote } from "@/types/gcc-review";

export type GCCSoapViewModel = Pick<GCCSoapNote, "subjective" | "objective" | "assessment" | "plan">;

export function mapSoapToViewModel(soapNote: GCCSoapNote): GCCSoapViewModel {
  return {
    subjective: soapNote.subjective,
    objective: soapNote.objective,
    assessment: soapNote.assessment,
    plan: soapNote.plan,
  };
}

export function countRenderedSoapFields(viewModel: GCCSoapViewModel) {
  const values: unknown[] = [
    viewModel.subjective.chiefComplaint,
    viewModel.subjective.patientNarrative,
    viewModel.subjective.symptoms,
    viewModel.subjective.aggravatingFactors,
    viewModel.subjective.relievingFactors,
    viewModel.subjective.history,
    viewModel.subjective.reportedDuration,
    viewModel.subjective.painScore,
    viewModel.objective.observations,
    viewModel.objective.interventions,
    viewModel.objective.functionalFindings,
    viewModel.objective.measurements,
    viewModel.assessment.summary,
    viewModel.assessment.diagnoses,
    viewModel.assessment.responseToTreatment,
    viewModel.assessment.functionalLimitations,
    viewModel.assessment.progress,
    viewModel.assessment.risksOrFlags,
    viewModel.plan.interventions,
    viewModel.plan.recommendations,
    viewModel.plan.homeProgram,
    viewModel.plan.followUp,
    viewModel.plan.frequency,
    viewModel.plan.clinicianActionsRequired,
  ];
  return values.reduce<number>((count, value) => count + (
    typeof value === "string" && value.trim() ? 1 : Array.isArray(value) && value.length ? value.length : 0
  ), 0);
}

export function hasSoapSectionData(section: Record<string, unknown>) {
  return Object.values(section).some((value) =>
    typeof value === "string" && Boolean(value.trim())
    || Array.isArray(value) && value.length > 0,
  );
}
