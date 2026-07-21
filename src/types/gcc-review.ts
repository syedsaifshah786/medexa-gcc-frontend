import type { GCCLocale } from "@/i18n/types";

export type GCCSoapNote = {
  sectionTitle?: string;
  narrativeTitle?: string;
  symptomsTitle?: string;
  historyTitle?: string;
  subjective: {
    chiefComplaint: string | null;
    patientNarrative: string | null;
    symptoms: string[];
    aggravatingFactors: string[];
    relievingFactors: string[];
    history: string | null;
    reportedDuration: string | null;
    painScore: string | null;
    sourceEvidence: string[];
  };
  objective: {
    observations: string[];
    interventions: string[];
    functionalFindings: string[];
    measurements: string[];
    sourceEvidence: string[];
  };
  assessment: {
    summary: string | null;
    diagnoses: string[];
    responseToTreatment: string | null;
    functionalLimitations: string[];
    progress: string | null;
    risksOrFlags: string[];
    sourceEvidence: string[];
    clinicianReviewRequired: boolean;
  };
  plan: {
    interventions: string[];
    recommendations: string[];
    homeProgram: string[];
    followUp: string | null;
    frequency: string | null;
    clinicianActionsRequired: string[];
    sourceEvidence: string[];
    clinicianReviewRequired: boolean;
  };
  clinicianReviewRequired: boolean;
};

export type GCCBillingSessionItem = {
  id?: string;
  code: string;
  codingSystem: string;
  description: string;
  status: string;
  evidence: string;
  confidence: number | null;
};

export type GCCBillingIntelligence = {
  sectionTitle?: string;
  sessionItemsTitle?: string;
  revenueTitle?: string;
  denialLoopTitle?: string;
  items: GCCBillingSessionItem[];
  dxSupportConfidence: number | null;
  claimsReadiness: number | null;
  denialItems: string[];
  clinicianReviewRequired: boolean;
};

export type GCCCarePlanItem = {
  date?: string;
  day?: string;
  label?: string;
};

export type GCCPatientSummary = {
  sectionTitle?: string;
  keyImprovementTitle?: string;
  upcomingCarePlanTitle?: string;
  intro: string;
  summary: string;
  sessionNumber: number | null;
  totalSessions: number | null;
  activities: string[];
  focusAreas: string[];
  keyPoints: string[];
  keyImprovement: string;
  performanceSummary: string;
  carePlan: GCCCarePlanItem[];
  closingMessage: string;
  clinicianReviewRequired: boolean;
  sessionDetailsPrefix?: string;
  sessionDetailsSuffix?: string;
};

export type GCCReviewBundle = {
  sessionId: string;
  locale: GCCLocale;
  status: "completed";
  source: "live";
  transcript: string;
  elapsedMs: number;
  soapNote: GCCSoapNote;
  billingIntelligence: GCCBillingIntelligence;
  patientSummary: GCCPatientSummary;
  generatedAt: string;
  llmUsed: boolean;
  fallbackReason: string | null;
};

export type GCCMappedFinalizeResponse = {
  sessionId: string;
  savedToStore: true;
  status: "completed";
  transcript: string;
  elapsedMs: number;
  reviewBundle: GCCReviewBundle;
  llmUsed: boolean;
  fallbackReason: string | null;
  provider: string;
  model: string;
};
