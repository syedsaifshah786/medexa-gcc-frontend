export type GCCBillingCode = {
  id: string;
  code: string;
  system: string;
  status: string;
  statusType: "justified" | "matched" | "review";
  description: string;
};

export const gccSoapReviewData = {
  patientNarrative:
    'Patient reports lower back discomfort for 14 days, especially after sitting.\nExperiences mobility issues and sharp pains. States: "My back feels tight and stiff."',
  symptoms: ["Sharp pain worsens by sitting", "Eases with rest"],
  history: "Last episode 2 years ago, treated with Physical Therapy. No surgical intervention reported.",
};

export const gccBillingReviewData = {
  codes: [
    {
      id: "icd-radiculopathy",
      code: "M54.13",
      system: "ICD-10 AM",
      status: "Justified",
      statusType: "justified",
      description: "Radiculopathy, lumbar region",
    },
    {
      id: "cchi-radiculopathy",
      code: "9.3.42",
      system: "CCHI-BS",
      status: "Matched",
      statusType: "matched",
      description: "Radiculopathy, lumbar region",
    },
  ] satisfies GCCBillingCode[],
  newCode: {
    id: "gcc-therapeutic-exercise",
    code: "97110",
    system: "GCC-BS",
    status: "Review Required",
    statusType: "review",
    description: "Therapeutic Exercise",
  } satisfies GCCBillingCode,
  revenue: [
    { label: "DX Support Confidence", value: 94.4, tone: "green" },
    { label: "Claims Readiness", value: 98.4, tone: "blue" },
  ],
};

export const gccPatientSummaryData = {
  intro:
    "Dear Patient, today you completed Session 4 of 12 in your therapy plan of care. The session included gait training and therapeutic exercises focused on improving lower back pain, fatigue, strength, and balance.",
  improvement: "Clinical improvement recorded with knee flexion increased by 15 degrees.",
  followUp:
    "You performed well and required some movement assistance, which is expected at this stage. Overall stability is trending upward compared to baseline.",
  carePlan: [
    { day: "Mon", date: "26" },
    { day: "Wed", date: "28" },
    { day: "Fri", date: "30" },
  ],
};
