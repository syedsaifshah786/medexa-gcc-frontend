import type { TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";
import { buildFinalTranscript, normalizeTranscript } from "@/lib/gcc/transcript-utils";

export type GCCSoapNote = {
  subjective: {
    chief_complaint: string;
    patient_narrative: string;
    symptoms: string[];
    history: string;
    reported_duration?: string;
    pain_score?: string;
    source_evidence?: string[];
  };
  objective: {
    observations: string[];
    interventions: string[];
    functional_findings?: string[];
    measurements: string[];
    source_evidence?: string[];
  };
  assessment: {
    clinical_summary: string;
    response_to_treatment: string;
    functional_limitations: string[];
    progress?: string;
    risks_or_flags?: string[];
    source_evidence?: string[];
  };
  plan: {
    next_steps: string[];
    home_program: string[];
    follow_up: string;
    frequency?: string;
    clinician_actions_required?: string[];
    source_evidence?: string[];
  };
  clinician_review_required: boolean;
};

export type GCCBillingSessionItem = {
  id?: string;
  code: string;
  coding_system: string;
  description: string;
  status: string;
  evidence: string;
  confidence: number | null;
};

export type GCCBillingIntelligence = {
  session_items: GCCBillingSessionItem[];
  dx_support_confidence: number | null;
  claims_readiness: number | null;
  denial_items: string[];
  clinician_review_required: boolean;
};

export type GCCCarePlanItem = {
  date?: string;
  day?: string;
  label?: string;
};

export type GCCPatientSummary = {
  intro: string;
  session_number: number | null;
  total_sessions: number | null;
  activities: string[];
  focus_areas: string[];
  key_improvement: string;
  performance_summary: string;
  upcoming_care_plan: GCCCarePlanItem[];
  closing_message: string;
  clinician_review_required: boolean;
};

export type GCCReviewBundle = {
  sessionId: string;
  status: "completed";
  transcript: string;
  elapsedMs: number;
  soapNote: GCCSoapNote;
  billingIntelligence: GCCBillingIntelligence;
  patientSummary: GCCPatientSummary;
  generatedAt: string;
  llmUsed?: boolean;
  fallbackReason?: string | null;
};

export type GCCFinalizeSessionResponse = {
  session_id: string;
  saved_to_store: boolean;
  status: "completed" | string;
  transcript: string;
  elapsed_ms: number;
  review_bundle: {
    soap_note: GCCSoapNote;
    billing_intelligence: GCCBillingIntelligence;
    patient_summary: GCCPatientSummary;
  };
  llm_used: boolean;
  fallback_reason: string | null;
};

type FinalizePayload = {
  sessionId: string;
  transcript: string;
  transcriptSegments: TranscriptSegment[];
  elapsedMs: number;
};

const emptySoapNote: GCCSoapNote = {
  subjective: {
    chief_complaint: "",
    patient_narrative: "",
    symptoms: [],
    history: "",
    reported_duration: "",
    pain_score: "",
    source_evidence: [],
  },
  objective: {
    observations: [],
    interventions: [],
    functional_findings: [],
    measurements: [],
    source_evidence: [],
  },
  assessment: {
    clinical_summary: "",
    response_to_treatment: "",
    functional_limitations: [],
    progress: "",
    risks_or_flags: [],
    source_evidence: [],
  },
  plan: {
    next_steps: [],
    home_program: [],
    follow_up: "",
    frequency: "",
    clinician_actions_required: [],
    source_evidence: [],
  },
  clinician_review_required: true,
};

const emptyBillingIntelligence: GCCBillingIntelligence = {
  session_items: [],
  dx_support_confidence: null,
  claims_readiness: null,
  denial_items: [],
  clinician_review_required: true,
};

const emptyPatientSummary: GCCPatientSummary = {
  intro: "",
  session_number: null,
  total_sessions: null,
  activities: [],
  focus_areas: [],
  key_improvement: "",
  performance_summary: "",
  upcoming_care_plan: [],
  closing_message: "",
  clinician_review_required: true,
};

export function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

export function getReviewBundleStorageKey(sessionId: string) {
  return `medexa_gcc_review_bundle_${sessionId}`;
}

export function getSoapStorageKey(sessionId: string) {
  return `medexa_gcc_soap_note_${sessionId}`;
}

export function getSoapMetaStorageKey(sessionId: string) {
  return `medexa_gcc_soap_meta_${sessionId}`;
}

function splitTranscriptSentences(transcript: string) {
  return normalizeTranscript(transcript)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function createTranscriptDerivedReviewBundle({
  sessionId,
  transcript,
  elapsedMs,
  fallbackReason,
}: {
  sessionId: string;
  transcript: string;
  elapsedMs: number;
  fallbackReason: string | null;
}): GCCReviewBundle {
  const cleanTranscript = normalizeTranscript(transcript);
  const sentences = splitTranscriptSentences(cleanTranscript);
  const symptomSentences = sentences.filter((sentence) => /\b(pain|ache|discomfort|stiff|tight|mobility|fatigue|weak|balance|sore|numb|tingl|swelling|dizzi)\b/i.test(sentence));
  const activitySentences = sentences.filter((sentence) => /\b(exercise|walk|walking|stretch|therapy|movement|mobility|strength|balance|training|practice|home program)\b/i.test(sentence));
  const measurementSentences = sentences.filter((sentence) => /\b\d+\s*(degree|degrees|cm|mm|percent|%|seconds?|minutes?|reps?|sets?)\b/i.test(sentence));
  const planSentences = sentences.filter((sentence) => /\b(plan|follow up|continue|next|home|return|review|refer|schedule)\b/i.test(sentence));
  const evidence = sentences.slice(0, 4);
  const narrative = cleanTranscript;

  return {
    sessionId,
    status: "completed",
    transcript: cleanTranscript,
    elapsedMs,
    soapNote: {
      subjective: {
        ...emptySoapNote.subjective,
        chief_complaint: symptomSentences[0] ?? "",
        patient_narrative: narrative,
        symptoms: symptomSentences.slice(0, 6),
        source_evidence: evidence,
      },
      objective: {
        ...emptySoapNote.objective,
        interventions: activitySentences.slice(0, 6),
        measurements: measurementSentences.slice(0, 6),
        source_evidence: evidence,
      },
      assessment: {
        ...emptySoapNote.assessment,
        clinical_summary: narrative,
        functional_limitations: symptomSentences.slice(0, 4),
        source_evidence: evidence,
      },
      plan: {
        ...emptySoapNote.plan,
        next_steps: planSentences.slice(0, 5),
        source_evidence: evidence,
      },
      clinician_review_required: true,
    },
    billingIntelligence: {
      ...emptyBillingIntelligence,
    },
    patientSummary: {
      ...emptyPatientSummary,
      intro: narrative,
      activities: activitySentences.slice(0, 5),
      focus_areas: symptomSentences.slice(0, 5),
      performance_summary: activitySentences.length || symptomSentences.length ? sentences.slice(0, 3).join(" ") : "",
    },
    generatedAt: new Date().toISOString(),
    llmUsed: false,
    fallbackReason,
  };
}

function normalizeResponseBundle(response: GCCFinalizeSessionResponse): GCCReviewBundle {
  return {
    sessionId: response.session_id,
    status: "completed",
    transcript: response.transcript ?? "",
    elapsedMs: response.elapsed_ms ?? 0,
    soapNote: response.review_bundle.soap_note,
    billingIntelligence: response.review_bundle.billing_intelligence,
    patientSummary: response.review_bundle.patient_summary,
    generatedAt: new Date().toISOString(),
    llmUsed: response.llm_used,
    fallbackReason: response.fallback_reason,
  };
}

function validateFinalizeResponse(value: unknown): GCCFinalizeSessionResponse {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid finalize-session response.");
  }

  const response = value as Partial<GCCFinalizeSessionResponse> & {
    soap_note?: GCCSoapNote;
    billing_intelligence?: GCCBillingIntelligence;
    patient_summary?: GCCPatientSummary;
    llm_fallback_reason?: string | null;
  };

  const reviewBundle = response.review_bundle ?? {
    soap_note: response.soap_note,
    billing_intelligence: response.billing_intelligence,
    patient_summary: response.patient_summary,
  };

  if (response.saved_to_store !== true || !reviewBundle?.soap_note) {
    throw new Error("Review bundle was not saved by finalize-session.");
  }

  return {
    session_id: response.session_id ?? "",
    saved_to_store: true,
    status: response.status ?? "completed",
    transcript: response.transcript ?? "",
    elapsed_ms: response.elapsed_ms ?? 0,
    review_bundle: {
      soap_note: reviewBundle.soap_note,
      billing_intelligence: reviewBundle.billing_intelligence ?? emptyBillingIntelligence,
      patient_summary: reviewBundle.patient_summary ?? emptyPatientSummary,
    },
    llm_used: response.llm_used ?? false,
    fallback_reason: response.fallback_reason ?? response.llm_fallback_reason ?? null,
  };
}

export function saveReviewBundleLocally(bundle: GCCReviewBundle) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getReviewBundleStorageKey(bundle.sessionId), JSON.stringify(bundle));
}

export function saveSoapLocally({
  sessionId,
  soapNote,
  elapsedMs,
  transcript,
  llmUsed,
  fallbackReason,
}: {
  sessionId: string;
  soapNote: GCCSoapNote;
  elapsedMs: number;
  transcript: string;
  llmUsed: boolean;
  fallbackReason: string | null;
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getSoapStorageKey(sessionId), JSON.stringify(soapNote));
  localStorage.setItem(
    getSoapMetaStorageKey(sessionId),
    JSON.stringify({
      elapsedMs,
      transcript,
      generatedAt: new Date().toISOString(),
      llmUsed,
      fallbackReason,
    }),
  );
}

export async function finalizeGCCSession(payload: FinalizePayload): Promise<GCCFinalizeSessionResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const transcript = buildFinalTranscript({
    finalTranscript: payload.transcript,
    transcriptSegments: payload.transcriptSegments,
    interimTranscript: "",
    latestHeardText: "",
  });

  if (!transcript) {
    throw new Error("No clinical transcript was captured. Continue the session or enter a note before generating review.");
  }

  if (!apiBaseUrl) {
    const bundle = createTranscriptDerivedReviewBundle({
      sessionId: payload.sessionId,
      transcript,
      elapsedMs: payload.elapsedMs,
      fallbackReason: "NEXT_PUBLIC_API_BASE_URL is not configured. Saved local transcript-derived review bundle.",
    });

    return {
      session_id: payload.sessionId,
      saved_to_store: true,
      status: "completed",
      transcript,
      elapsed_ms: payload.elapsedMs,
      review_bundle: {
        soap_note: bundle.soapNote,
        billing_intelligence: bundle.billingIntelligence,
        patient_summary: bundle.patientSummary,
      },
      llm_used: false,
      fallback_reason: bundle.fallbackReason ?? null,
    };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(`${apiBaseUrl}/sessions/${encodeURIComponent(payload.sessionId)}/finalize-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        session_id: payload.sessionId,
        market: "gcc",
        language: "en",
        transcript,
        transcript_segments: payload.transcriptSegments,
        elapsed_ms: payload.elapsedMs,
        patient: {
          name: "Samuel Thompson",
          age: 58,
          gender: "Male",
        },
        generate_review_bundle: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Finalize session failed with status ${response.status}.`);
    }

    const validated = validateFinalizeResponse(await response.json());
    if (!validated.review_bundle.billing_intelligence || !validated.review_bundle.patient_summary) {
      throw new Error("Finalize session did not return a complete review bundle.");
    }

    return {
      ...validated,
      session_id: validated.session_id || payload.sessionId,
      transcript: validated.transcript || transcript,
      elapsed_ms: validated.elapsed_ms || payload.elapsedMs,
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : "Backend unavailable. Saved local transcript-derived review bundle.";
    const bundle = createTranscriptDerivedReviewBundle({
      sessionId: payload.sessionId,
      transcript,
      elapsedMs: payload.elapsedMs,
      fallbackReason,
    });

    return {
      session_id: payload.sessionId,
      saved_to_store: true,
      status: "completed",
      transcript,
      elapsed_ms: payload.elapsedMs,
      review_bundle: {
        soap_note: bundle.soapNote,
        billing_intelligence: bundle.billingIntelligence,
        patient_summary: bundle.patientSummary,
      },
      llm_used: false,
      fallback_reason: fallbackReason,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function buildReviewBundleFromFinalizeResponse(response: GCCFinalizeSessionResponse): GCCReviewBundle {
  return normalizeResponseBundle(response);
}

function normalizeStoredBundle(value: unknown, sessionId: string): GCCReviewBundle | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<GCCReviewBundle>;
  if (parsed.sessionId !== sessionId || parsed.status !== "completed" || !parsed.soapNote || !parsed.billingIntelligence || !parsed.patientSummary) {
    return null;
  }
  return parsed as GCCReviewBundle;
}

export function readReviewBundleFromCache(sessionId: string) {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(getReviewBundleStorageKey(sessionId));
    if (!cached) return null;
    return normalizeStoredBundle(JSON.parse(cached), sessionId);
  } catch {
    return null;
  }
}

export async function fetchGCCReviewBundle(sessionId: string): Promise<GCCReviewBundle | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const bundleResponse = await fetch(`${apiBaseUrl}/sessions/${encodeURIComponent(sessionId)}/review-bundle`);
  if (bundleResponse.ok) {
    const value = await bundleResponse.json();
    const rawBundle = value?.review_bundle ?? value;
    const transcript = value?.transcript ?? rawBundle?.transcript ?? "";
    const elapsedMs = value?.elapsed_ms ?? rawBundle?.elapsedMs ?? 0;
    const soapNote = rawBundle?.soap_note ?? rawBundle?.soapNote;
    const billingIntelligence = rawBundle?.billing_intelligence ?? rawBundle?.billingIntelligence;
    const patientSummary = rawBundle?.patient_summary ?? rawBundle?.patientSummary;

    if (soapNote && billingIntelligence && patientSummary) {
      return {
        sessionId,
        status: "completed",
        transcript,
        elapsedMs,
        soapNote,
        billingIntelligence,
        patientSummary,
        generatedAt: rawBundle?.generatedAt ?? value?.generated_at ?? new Date().toISOString(),
        llmUsed: value?.llm_used ?? rawBundle?.llmUsed,
        fallbackReason: value?.fallback_reason ?? rawBundle?.fallbackReason ?? null,
      };
    }
  }

  const [soapNote, billingIntelligence, patientSummary] = await Promise.all([
    fetchGCCSoapNote(sessionId),
    fetchGCCBillingIntelligence(sessionId),
    fetchGCCPatientSummary(sessionId),
  ]);

  if (!soapNote || !billingIntelligence || !patientSummary) return null;

  return {
    sessionId,
    status: "completed",
    transcript: "",
    elapsedMs: 0,
    soapNote,
    billingIntelligence,
    patientSummary,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchGCCSoapNote(sessionId: string) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(`${apiBaseUrl}/soap-notes/${encodeURIComponent(sessionId)}`);
  if (!response.ok) return null;
  const value = await response.json();
  return (value?.soap_note ?? value) as GCCSoapNote;
}

export async function fetchGCCBillingIntelligence(sessionId: string) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(`${apiBaseUrl}/billing-intelligence/${encodeURIComponent(sessionId)}`);
  if (!response.ok) return null;
  const value = await response.json();
  return (value?.billing_intelligence ?? value) as GCCBillingIntelligence;
}

export async function fetchGCCPatientSummary(sessionId: string) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(`${apiBaseUrl}/patient-summary/${encodeURIComponent(sessionId)}`);
  if (!response.ok) return null;
  const value = await response.json();
  return (value?.patient_summary ?? value) as GCCPatientSummary;
}
