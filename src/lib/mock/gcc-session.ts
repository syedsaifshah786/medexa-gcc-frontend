export type TranscriptLine = {
  time: string;
  speaker: "Dr. Sarah" | "Samuel";
  content: string;
  highlight?: string;
};

export type Suggestion = {
  id: string;
  type: "Protocol Ask" | "Billing";
  title: string;
  detected?: string;
};

export const gccSession = {
  patient: {
    name: "Samuel Thompson",
    demographics: "58Y/M",
    sessionProgress: "04 / 12 Sessions",
    initials: "ST",
    status: "Verified",
  },
  claimQuality: 86,
  recordingTime: "20:02",
  suggestionsCount: 16,
  transcript: [
    {
      time: "19:42",
      speaker: "Dr. Sarah",
      content: "Tell me where the discomfort is strongest today.",
    },
    {
      time: "19:48",
      speaker: "Samuel",
      content: "It starts in my lower back, especially after sitting for a while.",
      highlight: "lower back",
    },
    {
      time: "19:56",
      speaker: "Samuel",
      content: "Sometimes there is a sharp twinge near my right hip when I stand.",
      highlight: "sharp twinge near my right hip",
    },
  ] satisfies TranscriptLine[],
  suggestions: [
    {
      id: "family-history",
      type: "Protocol Ask",
      title: "Does anyone in your family have diabetes or vascular issues?",
      detected: "Patient reports persistent fatigue and lower back pain for 3 weeks.",
    },
    {
      id: "therapeutic-act",
      type: "Billing",
      title: "A Therapeutic Act matching CCHI-BS procedure has been identified.",
    },
    {
      id: "physical-activity",
      type: "Protocol Ask",
      title: "How often do you engage in physical activity each week?",
    },
  ] satisfies Suggestion[],
} as const;
