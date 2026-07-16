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
        code: "M54.13",
        system: "ICD-10 AM",
        description: "Radiculopathy, lumbar region",
        status: "Justified",
      },
      {
        code: "9.3.42",
        system: "CCHI-BS",
        description: "Radiculopathy, lumbar region",
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
    soapNote: {
      section_title: demo.soap_note.sectionTitle,
      narrative_title: demo.soap_note.narrativeTitle,
      symptoms_title: demo.soap_note.symptomsTitle,
      history_title: demo.soap_note.historyTitle,
      subjective: {
        chief_complaint: demo.soap_note.chiefComplaintTitle,
        patient_narrative: demo.soap_note.chiefComplaint,
        symptoms: [...demo.soap_note.symptoms],
        history: demo.soap_note.history,
      },
      objective: {
        observations: [],
        interventions: [],
        measurements: [],
      },
      assessment: {
        clinical_summary: "",
        response_to_treatment: "",
        functional_limitations: [],
      },
      plan: {
        next_steps: [],
        home_program: [],
        follow_up: "",
      },
      clinician_review_required: false,
    },
    billingIntelligence: {
      section_title: demo.billing_intelligence.sectionTitle,
      session_items_title: demo.billing_intelligence.sessionItemsTitle,
      revenue_title: demo.billing_intelligence.revenueTitle,
      denial_loop_title: demo.billing_intelligence.denialLoopTitle,
      session_items: demo.billing_intelligence.codes.map((item, index) => ({
        id: `gcc-demo-code-${index}`,
        code: item.code,
        coding_system: item.system,
        description: item.description,
        status: item.status,
        evidence: "",
        confidence: null,
      })),
      dx_support_confidence: demo.billing_intelligence.dxSupportConfidence,
      claims_readiness: demo.billing_intelligence.claimsReadiness,
      denial_items: [],
      clinician_review_required: false,
    },
    patientSummary: {
      section_title: demo.patient_summary.sectionTitle,
      key_improvement_title: demo.patient_summary.keyImprovementTitle,
      upcoming_care_plan_title: demo.patient_summary.upcomingCarePlanTitle,
      intro: demo.patient_summary.intro,
      session_number: 4,
      total_sessions: 12,
      activities: [...demo.patient_summary.sessionItems],
      focus_areas: [],
      key_improvement: demo.patient_summary.keyImprovement,
      performance_summary: demo.patient_summary.progressText,
      upcoming_care_plan: demo.patient_summary.upcomingDates.map((item) => ({ ...item })),
      closing_message: demo.patient_summary.carePlanFooter,
      clinician_review_required: false,
      session_details_prefix: demo.patient_summary.sessionDetailsPrefix,
      session_details_suffix: demo.patient_summary.sessionDetailsSuffix,
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
