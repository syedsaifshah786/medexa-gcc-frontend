import type { TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";
import { buildFinalTranscript, normalizeTranscript } from "@/lib/gcc/transcript-utils";
import type { GCCLocale } from "@/i18n/types";
import type { SBSMatch } from "@/types/sbs-v3";

export type GCCSoapNote = {
  section_title?: string;
  narrative_title?: string;
  symptoms_title?: string;
  history_title?: string;
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
  section_title?: string;
  session_items_title?: string;
  revenue_title?: string;
  denial_loop_title?: string;
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
  section_title?: string;
  key_improvement_title?: string;
  upcoming_care_plan_title?: string;
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
  session_details_prefix?: string;
  session_details_suffix?: string;
};

export type GCCReviewBundle = {
  sessionId: string;
  locale: GCCLocale;
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
  provider: "groq";
  model: string;
  language?: GCCLocale;
  locale?: string;
};

type FinalizePayload = {
  sessionId: string;
  transcript: string;
  transcriptSegments: TranscriptSegment[];
  elapsedMs: number;
  locale?: GCCLocale;
  patient?: {
    name: string;
    age: number | null;
    gender: string;
  };
  sbsMatches: readonly SBSMatch[];
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

export function getReviewBundleStorageKey(sessionId: string, locale: GCCLocale) {
  return `medexa_gcc_review_bundle_${sessionId}_${locale}`;
}

export function getSoapStorageKey(sessionId: string, locale: GCCLocale) {
  return `medexa_gcc_soap_note_${sessionId}_${locale}`;
}

export function getSoapMetaStorageKey(sessionId: string, locale: GCCLocale) {
  return `medexa_gcc_soap_meta_${sessionId}_${locale}`;
}

function splitTranscriptSentences(transcript: string) {
  return normalizeTranscript(transcript)
    .split(/(?<=[.!?؟])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function createTranscriptDerivedReviewBundle({
  sessionId,
  transcript,
  elapsedMs,
  fallbackReason,
  locale = "en",
}: {
  sessionId: string;
  transcript: string;
  elapsedMs: number;
  fallbackReason: string | null;
  locale?: GCCLocale;
}): GCCReviewBundle {
  const cleanTranscript = normalizeTranscript(transcript);
  const sentences = splitTranscriptSentences(cleanTranscript);
  const symptomPattern = locale === "ar"
    ? /(ألم|الم|وجع|تيبس|إرهاق|ارهاق|ضعف|دوار|تنميل|خدر|تورم|توازن|صعوبة|محدود|سقوط)/
    : /\b(pain|ache|discomfort|stiff|tight|mobility|fatigue|weak|balance|sore|numb|tingl|swelling|dizzi)\b/i;
  const activityPattern = locale === "ar"
    ? /(تمرين|تمارين|مشي|علاج|حركة|مرونة|قوة|توازن|تدريب|ممارسة|برنامج منزلي|مدى الحركة)/
    : /\b(exercise|walk|walking|stretch|therapy|movement|mobility|strength|balance|training|practice|home program)\b/i;
  const measurementPattern = locale === "ar"
    ? /[\d٠-٩]+(?:[.,٫][\d٠-٩]+)?\s*(درجة|درجات|سم|ملم|بالمئة|٪|ثانية|ثوان|دقيقة|دقائق|تكرار|مجموعات)/
    : /\b\d+\s*(degree|degrees|cm|mm|percent|%|seconds?|minutes?|reps?|sets?)\b/i;
  const planPattern = locale === "ar"
    ? /(خطة|متابعة|استمرار|واصل|التالي|المنزل|العودة|مراجعة|إحالة|احالة|موعد|يوصى|توصية)/
    : /\b(plan|follow up|continue|next|home|return|review|refer|schedule)\b/i;
  const symptomSentences = sentences.filter((sentence) => symptomPattern.test(sentence));
  const activitySentences = sentences.filter((sentence) => activityPattern.test(sentence));
  const measurementSentences = sentences.filter((sentence) => measurementPattern.test(sentence));
  const planSentences = sentences.filter((sentence) => planPattern.test(sentence));
  const evidence = sentences.slice(0, 4);
  const narrative = cleanTranscript;

  return {
    sessionId,
    locale,
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

function normalizeResponseBundle(
  response: GCCFinalizeSessionResponse,
  locale: GCCLocale,
): GCCReviewBundle {
  return {
    sessionId: response.session_id,
    locale,
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

function validateFinalizeResponse(
  value: unknown,
  expectedLanguage: GCCLocale,
): GCCFinalizeSessionResponse {
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
  const expectedLocale = expectedLanguage === "ar" ? "ar-SA" : "en-US";

  if (
    response.saved_to_store !== true ||
    response.status !== "completed" ||
    response.llm_used !== true ||
    response.provider !== "groq" ||
    !response.model ||
    response.language !== expectedLanguage ||
    response.locale !== expectedLocale ||
    !reviewBundle?.soap_note ||
    !reviewBundle.billing_intelligence ||
    !reviewBundle.patient_summary
  ) {
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
      billing_intelligence: reviewBundle.billing_intelligence,
      patient_summary: reviewBundle.patient_summary,
    },
    llm_used: response.llm_used ?? false,
    fallback_reason: response.fallback_reason ?? response.llm_fallback_reason ?? null,
    provider: "groq",
    model: response.model,
    language: response.language,
    locale: response.locale,
  };
}

export function saveReviewBundleLocally(bundle: GCCReviewBundle, locale = bundle.locale ?? "en") {
  if (typeof window === "undefined") return false;
  if (bundle.locale !== locale) return false;
  try {
    localStorage.setItem(
      getReviewBundleStorageKey(bundle.sessionId, locale),
      JSON.stringify({ ...bundle, locale }),
    );
    return true;
  } catch {
    return false;
  }
}

export function saveSoapLocally({
  sessionId,
  soapNote,
  elapsedMs,
  transcript,
  llmUsed,
  fallbackReason,
  locale = "en",
}: {
  sessionId: string;
  soapNote: GCCSoapNote;
  elapsedMs: number;
  transcript: string;
  llmUsed: boolean;
  fallbackReason: string | null;
  locale?: GCCLocale;
}) {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(getSoapStorageKey(sessionId, locale), JSON.stringify(soapNote));
    localStorage.setItem(
      getSoapMetaStorageKey(sessionId, locale),
      JSON.stringify({
        elapsedMs,
        transcript,
        generatedAt: new Date().toISOString(),
        llmUsed,
        fallbackReason,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function finalizeGCCSession(payload: FinalizePayload): Promise<GCCFinalizeSessionResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const locale = payload.locale ?? "en";
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
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
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
        language: locale,
        locale: locale === "ar" ? "ar-SA" : "en-US",
        transcript,
        transcript_segments: payload.transcriptSegments,
        elapsed_ms: payload.elapsedMs,
        patient: payload.patient ?? { name: "", age: null, gender: "" },
        sbs_matches: payload.sbsMatches,
        generate_review_bundle: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Finalize session failed with status ${response.status}.`);
    }

    const validated = validateFinalizeResponse(await response.json(), locale);
    if (!validated.review_bundle.billing_intelligence || !validated.review_bundle.patient_summary) {
      throw new Error("Finalize session did not return a complete review bundle.");
    }

    return {
      ...validated,
      session_id: validated.session_id || payload.sessionId,
      transcript: validated.transcript || transcript,
      elapsed_ms: validated.elapsed_ms || payload.elapsedMs,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function buildReviewBundleFromFinalizeResponse(
  response: GCCFinalizeSessionResponse,
  locale: GCCLocale = response.language ?? "en",
): GCCReviewBundle {
  return normalizeResponseBundle(response, locale);
}

function normalizeStoredBundle(
  value: unknown,
  sessionId: string,
  locale: GCCLocale,
): GCCReviewBundle | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<GCCReviewBundle>;
  if (parsed.sessionId !== sessionId || parsed.status !== "completed" || !parsed.soapNote || !parsed.billingIntelligence || !parsed.patientSummary) {
    return null;
  }
  if (parsed.locale !== undefined && parsed.locale !== locale) return null;
  if (locale === "ar" && parsed.locale !== "ar") return null;
  return { ...parsed, locale } as GCCReviewBundle;
}

export function readReviewBundleFromCache(sessionId: string, locale: GCCLocale = "en") {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(getReviewBundleStorageKey(sessionId, locale));
    const legacyCached = locale === "en"
      ? localStorage.getItem(`medexa_gcc_review_bundle_${sessionId}`)
      : null;
    const serialized = cached ?? legacyCached;
    if (!serialized) return null;
    return normalizeStoredBundle(JSON.parse(serialized), sessionId, locale);
  } catch {
    return null;
  }
}

export async function fetchGCCReviewBundle(
  sessionId: string,
  locale: GCCLocale = "en",
): Promise<GCCReviewBundle | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const query = new URLSearchParams({
    language: locale,
    locale: locale === "ar" ? "ar-SA" : "en-US",
  });
  const bundleResponse = await fetch(
    `${apiBaseUrl}/sessions/${encodeURIComponent(sessionId)}/review-bundle?${query}`,
    { cache: "no-store" },
  );
  if (bundleResponse.ok) {
    const value = await bundleResponse.json();
    const rawBundle = value?.review_bundle ?? value;
    if (value?.language !== locale || value?.locale !== (locale === "ar" ? "ar-SA" : "en-US")) {
      return null;
    }
    const transcript = value?.transcript ?? rawBundle?.transcript ?? "";
    const elapsedMs = value?.elapsed_ms ?? rawBundle?.elapsedMs ?? 0;
    const soapNote = rawBundle?.soap_note ?? rawBundle?.soapNote;
    const billingIntelligence = rawBundle?.billing_intelligence ?? rawBundle?.billingIntelligence;
    const patientSummary = rawBundle?.patient_summary ?? rawBundle?.patientSummary;

    if (soapNote && billingIntelligence && patientSummary) {
      return {
        sessionId,
        locale,
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
    fetchGCCSoapNote(sessionId, locale),
    fetchGCCBillingIntelligence(sessionId, locale),
    fetchGCCPatientSummary(sessionId, locale),
  ]);

  if (!soapNote || !billingIntelligence || !patientSummary) return null;

  return {
    sessionId,
    locale,
    status: "completed",
    transcript: "",
    elapsedMs: 0,
    soapNote,
    billingIntelligence,
    patientSummary,
    generatedAt: new Date().toISOString(),
  };
}

function getLocaleQuery(locale: GCCLocale) {
  return new URLSearchParams({
    language: locale,
    locale: locale === "ar" ? "ar-SA" : "en-US",
  }).toString();
}

export async function fetchGCCSoapNote(sessionId: string, locale: GCCLocale = "en") {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(
    `${apiBaseUrl}/soap-notes/${encodeURIComponent(sessionId)}?${getLocaleQuery(locale)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const value = await response.json();
  return (value?.soap_note ?? value) as GCCSoapNote;
}

export async function fetchGCCBillingIntelligence(sessionId: string, locale: GCCLocale = "en") {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(
    `${apiBaseUrl}/billing-intelligence/${encodeURIComponent(sessionId)}?${getLocaleQuery(locale)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const value = await response.json();
  return (value?.billing_intelligence ?? value) as GCCBillingIntelligence;
}

export async function fetchGCCPatientSummary(sessionId: string, locale: GCCLocale = "en") {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(
    `${apiBaseUrl}/patient-summary/${encodeURIComponent(sessionId)}?${getLocaleQuery(locale)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const value = await response.json();
  return (value?.patient_summary ?? value) as GCCPatientSummary;
}
