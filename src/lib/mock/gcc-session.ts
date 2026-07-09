export type TranscriptLine = {
  time: string;
  speaker: "Dr. Sarah" | "Samuel";
  content: string;
  highlight?: string | readonly string[];
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
      time: "12:04",
      speaker: "Dr. Sarah",
      content: "And how long has this been occurring?",
    },
    {
      time: "12:10",
      speaker: "Samuel",
      content: "It started about three weeks ago, mostly in the evenings after I finish working.",
    },
    {
      time: "12:18",
      speaker: "Dr. Sarah",
      content: "Does the pain radiate down towards the hip or remain centralized?",
    },
    {
      time: "12:25",
      speaker: "Samuel",
      content: "It mostly stays in my lower back but sometimes I feel a sharp twinge near my right hip.",
      highlight: ["lower back", "sharp twinge", "right hip"],
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
