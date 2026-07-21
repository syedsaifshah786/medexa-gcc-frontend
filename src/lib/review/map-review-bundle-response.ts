import type { GCCLocale } from "@/i18n/types";
import type {
  GCCBillingIntelligence,
  GCCBillingSessionItem,
  GCCCarePlanItem,
  GCCMappedFinalizeResponse,
  GCCPatientSummary,
  GCCReviewBundle,
  GCCSoapNote,
} from "@/types/gcc-review";
import { normalizeReviewLocale } from "@/lib/review/review-cache-key";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : null;
}

function child(source: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record(source[key]);
    if (value) return value;
  }
  return null;
}

function text(source: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function strings(source: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  }
  return [];
}

function numberOrNull(source: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function boolean(source: JsonRecord, defaultValue = true, ...keys: string[]) {
  for (const key of keys) {
    if (typeof source[key] === "boolean") return source[key] as boolean;
  }
  return defaultValue;
}

function mapSoapNote(source: JsonRecord): GCCSoapNote {
  const subjective = child(source, "subjective");
  const objective = child(source, "objective");
  const assessment = child(source, "assessment");
  const plan = child(source, "plan");
  if (!subjective || !objective || !assessment || !plan) throw new Error("SOAP note sections are incomplete.");
  return {
    sectionTitle: text(source, "sectionTitle", "section_title") ?? undefined,
    narrativeTitle: text(source, "narrativeTitle", "narrative_title") ?? undefined,
    symptomsTitle: text(source, "symptomsTitle", "symptoms_title") ?? undefined,
    historyTitle: text(source, "historyTitle", "history_title") ?? undefined,
    subjective: {
      chiefComplaint: text(subjective, "chiefComplaint", "chief_complaint"),
      patientNarrative: text(subjective, "patientNarrative", "patient_narrative"),
      symptoms: strings(subjective, "symptoms"),
      aggravatingFactors: strings(subjective, "aggravatingFactors", "aggravating_factors"),
      relievingFactors: strings(subjective, "relievingFactors", "relieving_factors"),
      history: text(subjective, "history"),
      reportedDuration: text(subjective, "reportedDuration", "reported_duration"),
      painScore: text(subjective, "painScore", "pain_score"),
      sourceEvidence: strings(subjective, "sourceEvidence", "source_evidence"),
    },
    objective: {
      observations: strings(objective, "observations"),
      interventions: strings(objective, "interventions"),
      functionalFindings: strings(objective, "functionalFindings", "functional_findings"),
      measurements: strings(objective, "measurements"),
      sourceEvidence: strings(objective, "sourceEvidence", "source_evidence"),
    },
    assessment: {
      summary: text(assessment, "summary", "clinicalSummary", "clinical_summary"),
      diagnoses: strings(assessment, "diagnoses"),
      responseToTreatment: text(assessment, "responseToTreatment", "response_to_treatment"),
      functionalLimitations: strings(assessment, "functionalLimitations", "functional_limitations"),
      progress: text(assessment, "progress"),
      risksOrFlags: strings(assessment, "risksOrFlags", "risks_or_flags"),
      sourceEvidence: strings(assessment, "sourceEvidence", "source_evidence"),
      clinicianReviewRequired: boolean(assessment, true, "clinicianReviewRequired", "clinician_review_required"),
    },
    plan: {
      interventions: strings(plan, "interventions"),
      recommendations: strings(plan, "recommendations", "nextSteps", "next_steps"),
      homeProgram: strings(plan, "homeProgram", "home_program"),
      followUp: text(plan, "followUp", "follow_up"),
      frequency: text(plan, "frequency"),
      clinicianActionsRequired: strings(plan, "clinicianActionsRequired", "clinician_actions_required"),
      sourceEvidence: strings(plan, "sourceEvidence", "source_evidence"),
      clinicianReviewRequired: boolean(plan, true, "clinicianReviewRequired", "clinician_review_required"),
    },
    clinicianReviewRequired: boolean(source, true, "clinicianReviewRequired", "clinician_review_required"),
  };
}

function mapBilling(source: JsonRecord): GCCBillingIntelligence {
  const rawItems = source.items ?? source.sessionItems ?? source.session_items;
  const items: GCCBillingSessionItem[] = Array.isArray(rawItems) ? rawItems.flatMap((value) => {
    const item = record(value);
    if (!item) return [];
    return [{
      id: text(item, "id") ?? undefined,
      code: text(item, "code") ?? "",
      codingSystem: text(item, "codingSystem", "coding_system") ?? "",
      description: text(item, "description") ?? "",
      status: text(item, "status") ?? "",
      evidence: text(item, "evidence") ?? "",
      confidence: numberOrNull(item, "confidence"),
    }];
  }) : [];
  return {
    sectionTitle: text(source, "sectionTitle", "section_title") ?? undefined,
    sessionItemsTitle: text(source, "sessionItemsTitle", "session_items_title") ?? undefined,
    revenueTitle: text(source, "revenueTitle", "revenue_title") ?? undefined,
    denialLoopTitle: text(source, "denialLoopTitle", "denial_loop_title") ?? undefined,
    items,
    dxSupportConfidence: numberOrNull(source, "dxSupportConfidence", "dx_support_confidence"),
    claimsReadiness: numberOrNull(source, "claimsReadiness", "claims_readiness"),
    denialItems: strings(source, "denialItems", "denial_items"),
    clinicianReviewRequired: boolean(source, true, "clinicianReviewRequired", "clinician_review_required"),
  };
}

function mapPatientSummary(source: JsonRecord): GCCPatientSummary {
  const rawCarePlan = source.carePlan ?? source.care_plan ?? source.upcomingCarePlan ?? source.upcoming_care_plan;
  const carePlan: GCCCarePlanItem[] = Array.isArray(rawCarePlan) ? rawCarePlan.flatMap((value) => {
    const item = record(value);
    return item ? [{ date: text(item, "date") ?? undefined, day: text(item, "day") ?? undefined, label: text(item, "label") ?? undefined }] : [];
  }) : [];
  return {
    sectionTitle: text(source, "sectionTitle", "section_title") ?? undefined,
    keyImprovementTitle: text(source, "keyImprovementTitle", "key_improvement_title") ?? undefined,
    upcomingCarePlanTitle: text(source, "upcomingCarePlanTitle", "upcoming_care_plan_title") ?? undefined,
    intro: text(source, "intro") ?? "",
    summary: text(source, "summary") ?? "",
    sessionNumber: numberOrNull(source, "sessionNumber", "session_number"),
    totalSessions: numberOrNull(source, "totalSessions", "total_sessions"),
    activities: strings(source, "activities"),
    focusAreas: strings(source, "focusAreas", "focus_areas"),
    keyPoints: strings(source, "keyPoints", "key_points"),
    keyImprovement: text(source, "keyImprovement", "key_improvement") ?? "",
    performanceSummary: text(source, "performanceSummary", "performance_summary") ?? "",
    carePlan,
    closingMessage: text(source, "closingMessage", "closing_message") ?? "",
    clinicianReviewRequired: boolean(source, true, "clinicianReviewRequired", "clinician_review_required"),
    sessionDetailsPrefix: text(source, "sessionDetailsPrefix", "session_details_prefix") ?? undefined,
    sessionDetailsSuffix: text(source, "sessionDetailsSuffix", "session_details_suffix") ?? undefined,
  };
}

export function countMeaningfulSoapFields(soap: GCCSoapNote) {
  const values: unknown[] = [
    soap.subjective.chiefComplaint, soap.subjective.patientNarrative, soap.subjective.symptoms,
    soap.subjective.aggravatingFactors, soap.subjective.relievingFactors, soap.subjective.history,
    soap.subjective.reportedDuration, soap.subjective.painScore, soap.objective.observations,
    soap.objective.interventions, soap.objective.functionalFindings, soap.objective.measurements,
    soap.assessment.summary, soap.assessment.diagnoses, soap.assessment.responseToTreatment,
    soap.assessment.functionalLimitations, soap.assessment.progress, soap.assessment.risksOrFlags,
    soap.plan.interventions, soap.plan.recommendations, soap.plan.homeProgram, soap.plan.followUp,
    soap.plan.frequency, soap.plan.clinicianActionsRequired,
  ];
  return values.reduce<number>((count, value) => count + (
    typeof value === "string" && value.trim() ? 1 : Array.isArray(value) && value.length ? value.length : 0
  ), 0);
}

export function mapReviewBundle(
  rawBundleValue: unknown,
  metadata: { sessionId: string; locale: GCCLocale; transcript?: string; elapsedMs?: number; generatedAt?: string; llmUsed?: boolean; fallbackReason?: string | null },
): GCCReviewBundle {
  const rawBundle = record(rawBundleValue);
  if (!rawBundle) throw new Error("Review bundle is missing.");
  const rawSoap = child(rawBundle, "soapNote", "soap_note");
  const rawBilling = child(rawBundle, "billingIntelligence", "billing_intelligence");
  const rawSummary = child(rawBundle, "patientSummary", "patient_summary");
  if (!rawSoap || !rawBilling || !rawSummary) throw new Error("Review bundle is incomplete.");
  const soapNote = mapSoapNote(rawSoap);
  if (countMeaningfulSoapFields(soapNote) === 0) throw new Error("Generated SOAP note is empty.");
  return {
    sessionId: metadata.sessionId,
    locale: metadata.locale,
    status: "completed",
    source: "live",
    transcript: metadata.transcript ?? "",
    elapsedMs: metadata.elapsedMs ?? 0,
    soapNote,
    billingIntelligence: mapBilling(rawBilling),
    patientSummary: mapPatientSummary(rawSummary),
    generatedAt: metadata.generatedAt ?? new Date().toISOString(),
    llmUsed: metadata.llmUsed ?? true,
    fallbackReason: metadata.fallbackReason ?? null,
  };
}

export function mapReviewBundleResponse(apiResponse: unknown, expectedLocale: GCCLocale = "en"): GCCMappedFinalizeResponse {
  const response = record(apiResponse);
  if (!response) throw new Error("Finalization response is invalid.");
  const sessionId = text(response, "sessionId", "session_id");
  const rawBundle = response.reviewBundle ?? response.review_bundle ?? (
    response.soap_note || response.soapNote
      ? {
          soap_note: response.soap_note ?? response.soapNote,
          billing_intelligence: response.billing_intelligence ?? response.billingIntelligence,
          patient_summary: response.patient_summary ?? response.patientSummary,
        }
      : undefined
  );
  const savedToStore = response.savedToStore ?? response.saved_to_store;
  if (!sessionId || savedToStore !== true || response.status !== "completed" || !record(rawBundle)) {
    throw new Error("Finalization response did not contain a completed review bundle.");
  }
  const locale = normalizeReviewLocale(text(response, "language", "locale") ?? expectedLocale);
  const elapsed = response.elapsedMs ?? response.elapsed_ms;
  const reviewBundle = mapReviewBundle(rawBundle, {
    sessionId,
    locale,
    transcript: text(response, "transcript") ?? "",
    elapsedMs: typeof elapsed === "number" ? elapsed : 0,
    llmUsed: response.llmUsed === true || response.llm_used === true,
    fallbackReason: text(response, "fallbackReason", "fallback_reason"),
  });
  return {
    sessionId,
    savedToStore: true,
    status: "completed",
    transcript: reviewBundle.transcript,
    elapsedMs: reviewBundle.elapsedMs,
    reviewBundle,
    llmUsed: reviewBundle.llmUsed,
    fallbackReason: reviewBundle.fallbackReason,
    provider: text(response, "provider") ?? "groq",
    model: text(response, "model") ?? "configured",
  };
}
