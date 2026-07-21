import type { GCCLocale } from "@/i18n/types";
import type { GCCReviewBundle } from "@/lib/gcc/session-api";

export const GCC_DEMO_REVIEW_BUNDLE = {
  soap_note: {
    sectionTitle: "Subjective Assessment",
    narrativeTitle: "Patient Narrative",
    chiefComplaintTitle: "Chief Complaint",
    chiefComplaint:
      "“Patient reports lower back discomfort for 14 days, especially after sitting. Experiences mobility issues and sharp pains. States: 'My back feels tight and stiff.'”",
    symptomsTitle: "Symptoms",
    symptoms: [
      "Sharp pain worsens by sitting",
      "Eases with rest",
    ],
    historyTitle: "History",
    history:
      "Last episode 2 years ago, treated with Physical Therapy. No surgical intervention reported.",
  },
  billing_intelligence: {
    sectionTitle: "Encounter Coding",
    sessionItemsTitle: "Session items",
    codes: [
      {
        code: "50115-00-00",
        system: "SBS V3",
        description: "",
        status: "Justified",
      },
      {
        code: "96120-00-00",
        system: "SBS V3",
        description: "",
        status: "Matched",
      },
      {
        code: "22065-00-00",
        system: "SBS V3",
        description: "",
        status: "Matched",
      },
    ],
    revenueTitle: "Revenue Intelligence",
    dxSupportConfidence: 94.4,
    claimsReadiness: 98.4,
    denialLoopTitle: "Active Denial Loop",
    denialLoopItems: 0,
  },
  patient_summary: {
    sectionTitle: "Session Summary Note",
    intro:
      "Dear Patient, today you completed Session 4 of 12 in your therapy plan of care.",
    sessionDetailsPrefix: "The session included",
    sessionItems: [
      "gait training",
      "therapeutic exercises",
    ],
    sessionDetailsSuffix:
      "focused on improving lower back pain, fatigue, strength, and balance.",
    keyImprovementTitle: "Key Improvement",
    keyImprovement:
      "Clinical improvement recorded with knee flexion increased by 15°.",
    progressText:
      "You performed well and required some movement assistance, which is expected at this stage. Overall stability is trending upward compared to baseline.",
    upcomingCarePlanTitle: "Upcoming Care Plan",
    upcomingDates: [
      { day: "Mon", date: "26" },
      { day: "Wed", date: "28" },
      { day: "Fri", date: "30" },
    ],
    carePlanFooter:
      "Continuing therapy 3 sessions this week",
  },
} as const;

type DemoReviewBundleOptions = {
  sessionId: string;
  locale: GCCLocale;
  transcript?: string;
  elapsedMs?: number;
};

export function createGCCDemoReviewBundle({
  sessionId,
  locale,
  transcript = "",
  elapsedMs = 0,
}: DemoReviewBundleOptions): GCCReviewBundle {
  const demo = GCC_DEMO_REVIEW_BUNDLE;

  return {
    sessionId,
    locale,
    status: "completed",
    transcript,
    elapsedMs,
    source: "live",
    soapNote: {
      sectionTitle: demo.soap_note.sectionTitle,
      narrativeTitle: demo.soap_note.narrativeTitle,
      symptomsTitle: demo.soap_note.symptomsTitle,
      historyTitle: demo.soap_note.historyTitle,
      subjective: {
        chiefComplaint: demo.soap_note.chiefComplaintTitle,
        patientNarrative: demo.soap_note.chiefComplaint,
        symptoms: [...demo.soap_note.symptoms],
        aggravatingFactors: [],
        relievingFactors: [],
        history: demo.soap_note.history,
        reportedDuration: null,
        painScore: null,
        sourceEvidence: [],
      },
      objective: {
        observations: [],
        interventions: [],
        functionalFindings: [],
        measurements: [],
        sourceEvidence: [],
      },
      assessment: {
        summary: null,
        diagnoses: [],
        responseToTreatment: null,
        functionalLimitations: [],
        progress: null,
        risksOrFlags: [],
        sourceEvidence: [],
        clinicianReviewRequired: false,
      },
      plan: {
        interventions: [],
        recommendations: [],
        homeProgram: [],
        followUp: null,
        frequency: null,
        clinicianActionsRequired: [],
        sourceEvidence: [],
        clinicianReviewRequired: false,
      },
      clinicianReviewRequired: false,
    },
    billingIntelligence: {
      sectionTitle: demo.billing_intelligence.sectionTitle,
      sessionItemsTitle: demo.billing_intelligence.sessionItemsTitle,
      revenueTitle: demo.billing_intelligence.revenueTitle,
      denialLoopTitle: demo.billing_intelligence.denialLoopTitle,
      items: demo.billing_intelligence.codes.map((item, index) => ({
        id: `gcc-demo-code-${index}`,
        code: item.code,
        codingSystem: item.system,
        description: item.description,
        status: item.status,
        evidence: "",
        confidence: null,
      })),
      dxSupportConfidence: demo.billing_intelligence.dxSupportConfidence,
      claimsReadiness: demo.billing_intelligence.claimsReadiness,
      denialItems: [],
      clinicianReviewRequired: false,
    },
    patientSummary: {
      sectionTitle: demo.patient_summary.sectionTitle,
      keyImprovementTitle: demo.patient_summary.keyImprovementTitle,
      upcomingCarePlanTitle: demo.patient_summary.upcomingCarePlanTitle,
      intro: demo.patient_summary.intro,
      summary: demo.patient_summary.intro,
      sessionNumber: 4,
      totalSessions: 12,
      activities: [...demo.patient_summary.sessionItems],
      focusAreas: [],
      keyPoints: [],
      keyImprovement: demo.patient_summary.keyImprovement,
      performanceSummary: demo.patient_summary.progressText,
      carePlan: demo.patient_summary.upcomingDates.map((item) => ({ ...item })),
      closingMessage: demo.patient_summary.carePlanFooter,
      clinicianReviewRequired: false,
      sessionDetailsPrefix: demo.patient_summary.sessionDetailsPrefix,
      sessionDetailsSuffix: demo.patient_summary.sessionDetailsSuffix,
    },
    generatedAt: new Date().toISOString(),
    llmUsed: false,
    fallbackReason: null,
  };
}

export function saveGCCDemoReviewBundleLocally(options: DemoReviewBundleOptions) {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(
      `medexa_gcc_review_bundle_${options.sessionId}`,
      JSON.stringify(GCC_DEMO_REVIEW_BUNDLE),
    );

    (["en", "ar"] as const).forEach((locale) => {
      const bundle = createGCCDemoReviewBundle({ ...options, locale });
      localStorage.setItem(
        `medexa_gcc_review_bundle_${options.sessionId}_${locale}`,
        JSON.stringify(bundle),
      );
    });
    return true;
  } catch {
    return false;
  }
}
