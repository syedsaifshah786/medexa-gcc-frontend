export type GCCDemoTranscriptLine = {
  id: string;
  speaker: "clinician" | "patient";
  speakerLabel: string;
  text: string;
};

export const GCC_DEMO_SESSION_TRANSCRIPT: GCCDemoTranscriptLine[] = [
  {
    id: "demo-001",
    speaker: "clinician",
    speakerLabel: "Clinician",
    text: "Good morning Samuel, how's the lower back been since our last visit?",
  },
  {
    id: "demo-002",
    speaker: "patient",
    speakerLabel: "Patient",
    text: "A bit better, but still pretty stiff when I first wake up.",
  },
  {
    id: "demo-003",
    speaker: "clinician",
    speakerLabel: "Clinician",
    text: "I'm applying manual therapy on your lumbar spine now to loosen that up.",
  },
  {
    id: "demo-004",
    speaker: "patient",
    speakerLabel: "Patient",
    text: "That pressure feels really good actually.",
  },
  {
    id: "demo-005",
    speaker: "clinician",
    speakerLabel: "Clinician",
    text: "Good. I'm working through the lumbar joints systematically.",
  },
  {
    id: "demo-006",
    speaker: "patient",
    speakerLabel: "Patient",
    text: "I can feel the tension releasing with each movement.",
  },
  {
    id: "demo-007",
    speaker: "clinician",
    speakerLabel: "Clinician",
    text: "Perfect. Now let's move into therapeutic exercise — working on lumbar core stabilization.",
  },
  {
    id: "demo-008",
    speaker: "patient",
    speakerLabel: "Patient",
    text: "I've been keeping up with the home exercises you gave me.",
  },
  {
    id: "demo-009",
    speaker: "clinician",
    speakerLabel: "Clinician",
    text: "That's great, consistency makes a real difference. A few more reps.",
  },
  {
    id: "demo-010",
    speaker: "patient",
    speakerLabel: "Patient",
    text: "These feel much harder than the home ones.",
  },
  {
    id: "demo-011",
    speaker: "clinician",
    speakerLabel: "Clinician",
    text: "That's intentional — we're adding resistance to build strength.",
  },
  {
    id: "demo-012",
    speaker: "patient",
    speakerLabel: "Patient",
    text: "How many more weeks of therapy do you think I'll need?",
  },
  {
    id: "demo-013",
    speaker: "clinician",
    speakerLabel: "Clinician",
    text: "Let's reassess in two weeks, you're making solid progress.",
  },
  {
    id: "demo-014",
    speaker: "patient",
    speakerLabel: "Patient",
    text: "Good to hear. My mornings have definitely been easier.",
  },
  {
    id: "demo-015",
    speaker: "clinician",
    speakerLabel: "Clinician",
    text: "Let's finish with a hot pack applied to your lumbar region for recovery.",
  },
  {
    id: "demo-016",
    speaker: "patient",
    speakerLabel: "Patient",
    text: "Oh that heat feels amazing after all that work.",
  },
  {
    id: "demo-017",
    speaker: "clinician",
    speakerLabel: "Clinician",
    text: "Give it ten minutes and you'll be all set. Great session today Samuel.",
  },
  {
    id: "demo-018",
    speaker: "patient",
    speakerLabel: "Patient",
    text: "Thank you, see you next week.",
  },
];
