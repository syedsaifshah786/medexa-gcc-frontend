import type { TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";
import { buildFinalTranscript, normalizeTranscript } from "@/lib/gcc/transcript-utils";
import type { GCCLocale } from "@/i18n/types";
import type { SBSMatch } from "@/types/sbs-v3";
import { countMeaningfulSoapFields, mapReviewBundle, mapReviewBundleResponse } from "@/lib/review/map-review-bundle-response";
import { getCompatibleReviewCacheKeys, getReviewCacheKey } from "@/lib/review/review-cache-key";
import type {
  GCCBillingIntelligence,
  GCCMappedFinalizeResponse,
  GCCPatientSummary,
  GCCReviewBundle,
  GCCSoapNote,
} from "@/types/gcc-review";

export type {
  GCCBillingIntelligence,
  GCCBillingSessionItem,
  GCCCarePlanItem,
  GCCPatientSummary,
  GCCReviewBundle,
  GCCSoapNote,
} from "@/types/gcc-review";

export type GCCFinalizeErrorKind =
  | "rate_limit"
  | "validation"
  | "authentication"
  | "backend_unavailable"
  | "invalid_review_bundle";

export class GCCFinalizeError extends Error {
  readonly kind: GCCFinalizeErrorKind;
  readonly errorCode: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;

  constructor(options: {
    kind: GCCFinalizeErrorKind;
    errorCode: string;
    message: string;
    retryable: boolean;
    retryAfterSeconds?: number | null;
  }) {
    super(options.message);
    this.name = "GCCFinalizeError";
    this.kind = options.kind;
    this.errorCode = options.errorCode;
    this.retryable = options.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }
}

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
    chiefComplaint: null,
    patientNarrative: null,
    symptoms: [],
    aggravatingFactors: [],
    relievingFactors: [],
    history: null,
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
    clinicianReviewRequired: true,
  },
  plan: {
    interventions: [],
    recommendations: [],
    homeProgram: [],
    followUp: null,
    frequency: null,
    clinicianActionsRequired: [],
    sourceEvidence: [],
    clinicianReviewRequired: true,
  },
  clinicianReviewRequired: true,
};

const emptyBillingIntelligence: GCCBillingIntelligence = {
  items: [],
  dxSupportConfidence: null,
  claimsReadiness: null,
  denialItems: [],
  clinicianReviewRequired: true,
};

const emptyPatientSummary: GCCPatientSummary = {
  intro: "",
  summary: "",
  sessionNumber: null,
  totalSessions: null,
  activities: [],
  focusAreas: [],
  keyPoints: [],
  keyImprovement: "",
  performanceSummary: "",
  carePlan: [],
  closingMessage: "",
  clinicianReviewRequired: true,
};

export function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");
}

export function getReviewBundleStorageKey(sessionId: string, locale: GCCLocale) {
  return getReviewCacheKey(sessionId, locale);
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
        chiefComplaint: symptomSentences[0] ?? null,
        patientNarrative: narrative,
        symptoms: symptomSentences.slice(0, 6),
        sourceEvidence: evidence,
      },
      objective: {
        ...emptySoapNote.objective,
        interventions: activitySentences.slice(0, 6),
        measurements: measurementSentences.slice(0, 6),
        sourceEvidence: evidence,
      },
      assessment: {
        ...emptySoapNote.assessment,
        summary: narrative,
        functionalLimitations: symptomSentences.slice(0, 4),
        sourceEvidence: evidence,
      },
      plan: {
        ...emptySoapNote.plan,
        recommendations: planSentences.slice(0, 5),
        sourceEvidence: evidence,
      },
      clinicianReviewRequired: true,
    },
    billingIntelligence: {
      ...emptyBillingIntelligence,
    },
    patientSummary: {
      ...emptyPatientSummary,
      intro: narrative,
      activities: activitySentences.slice(0, 5),
      focusAreas: symptomSentences.slice(0, 5),
      performanceSummary: activitySentences.length || symptomSentences.length ? sentences.slice(0, 3).join(" ") : "",
    },
    generatedAt: new Date().toISOString(),
    llmUsed: false,
    fallbackReason,
    source: "live",
  };
}

function finalizeErrorFromResponse(status: number, value: unknown) {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const detail = body.detail && typeof body.detail === "object" ? body.detail as Record<string, unknown> : {};
  const source = { ...detail, ...body };
  const errorCode = typeof source.error_code === "string" ? source.error_code : `http_${status}`;
  const backendMessage = typeof source.message === "string"
    ? source.message.trim()
    : typeof body.detail === "string"
      ? body.detail.trim()
      : "Review generation could not be completed.";
  const rawRetryAfter = source.retry_after_seconds;
  const retryAfterSeconds = typeof rawRetryAfter === "number" && rawRetryAfter > 0
    ? Math.ceil(rawRetryAfter)
    : null;
  const retryable = source.retryable === true || status === 429 || status >= 500;
  const kind: GCCFinalizeErrorKind =
    status === 429 || errorCode === "groq_rate_limited"
      ? "rate_limit"
      : status === 401 || status === 403 || errorCode.includes("auth") || errorCode.includes("permission")
        ? "authentication"
        : status === 400 || status === 422 || errorCode.includes("validation")
          ? "validation"
          : "backend_unavailable";
  return new GCCFinalizeError({
    kind,
    errorCode,
    message: backendMessage,
    retryable,
    retryAfterSeconds,
  });
}

export function saveReviewBundleLocally(bundle: GCCReviewBundle, locale = bundle.locale ?? "en") {
  if (typeof window === "undefined") return false;
  if (bundle.locale !== locale) return false;
  try {
    localStorage.setItem(
      getReviewBundleStorageKey(bundle.sessionId, locale),
      JSON.stringify({ ...bundle, locale, source: "live" }),
    );
    if (process.env.NODE_ENV === "development") {
      console.debug("[GCC review] cache write", {
        cacheKey: getReviewBundleStorageKey(bundle.sessionId, locale),
        cacheWriteSucceeded: true,
        mappedSoapFieldCount: countMeaningfulSoapFields(bundle.soapNote),
      });
    }
    return true;
  } catch {
    return false;
  }
}

export function cacheReviewBundleBeforeNavigation(
  bundle: GCCReviewBundle,
  locale: GCCLocale,
  setProviderBundle: (bundle: GCCReviewBundle) => void,
) {
  if (!saveReviewBundleLocally(bundle, locale)) return false;
  setProviderBundle(bundle);
  return true;
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

export async function finalizeGCCSession(payload: FinalizePayload): Promise<GCCMappedFinalizeResponse> {
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

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 55000);

  try {
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}/sessions/${encodeURIComponent(payload.sessionId)}/finalize-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
        session_id: payload.sessionId,
        market: "gcc",
        language: locale,
        locale: locale === "ar" ? "ar-SA" : "en-US",
        transcript,
        transcript_segments: payload.transcriptSegments.map((segment) => ({
          id: segment.id,
          speaker: segment.speaker ?? "unknown",
          text: segment.text,
          timestamp_ms: Math.max(0, Math.round(segment.timestampMs)),
          is_final: segment.isFinal,
          confidence: segment.confidence,
        })),
        elapsed_ms: Math.max(0, Math.round(payload.elapsedMs)),
        patient: payload.patient ?? { name: "", age: null, gender: "" },
        sbs_matches: payload.sbsMatches.map((match) => ({
          id: match.id,
          segment_id: match.segmentId,
          code: match.code,
          official_title: match.officialTitle,
          matched_text: match.matchedText,
          normalized_match: match.normalizedMatch,
          start: match.start,
          end: match.end,
          confidence: match.confidence,
          detected_at: match.detectedAt,
        })),
        generate_review_bundle: true,
        }),
      });
    } catch (error) {
      throw new GCCFinalizeError({
        kind: "backend_unavailable",
        errorCode: error instanceof DOMException && error.name === "AbortError" ? "request_timeout" : "network_error",
        message: "The review service is temporarily unavailable.",
        retryable: true,
        retryAfterSeconds: 5,
      });
    }

    const responseValue = await response.json().catch(() => null);
    if (process.env.NODE_ENV === "development") {
      const raw = responseValue && typeof responseValue === "object" ? responseValue as Record<string, unknown> : {};
      const rawBundle = raw.review_bundle && typeof raw.review_bundle === "object" ? raw.review_bundle as Record<string, unknown> : null;
      console.debug("[GCC review] finalize response", {
        finalizeHttpStatus: response.status,
        hasRawReviewBundle: Boolean(rawBundle),
        hasRawSoapNote: Boolean(rawBundle?.soap_note),
      });
    }
    if (!response.ok) {
      throw finalizeErrorFromResponse(response.status, responseValue);
    }

    let mapped: GCCMappedFinalizeResponse;
    try {
      mapped = mapReviewBundleResponse(responseValue, locale);
    } catch {
      throw new GCCFinalizeError({
        kind: "invalid_review_bundle",
        errorCode: "invalid_review_bundle",
        message: "The generated SOAP Notes were incomplete.",
        retryable: false,
      });
    }
    if (mapped.sessionId !== payload.sessionId || !normalizeTranscript(mapped.transcript)) {
      throw new GCCFinalizeError({
        kind: "invalid_review_bundle",
        errorCode: "mismatched_review_bundle",
        message: "The backend returned a mismatched review bundle.",
        retryable: false,
      });
    }
    if (process.env.NODE_ENV === "development") {
      console.debug("[GCC review] finalize mapped", {
        currentSessionIdMatchesResponse: mapped.sessionId === payload.sessionId,
        mappedSoapFieldCount: countMeaningfulSoapFields(mapped.reviewBundle.soapNote),
      });
    }
    return mapped;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function buildReviewBundleFromFinalizeResponse(
  response: GCCMappedFinalizeResponse,
): GCCReviewBundle {
  return response.reviewBundle;
}

function normalizeStoredBundle(
  value: unknown,
  sessionId: string,
  locale: GCCLocale,
): GCCReviewBundle | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<GCCReviewBundle>;
  if (parsed.sessionId !== sessionId || parsed.status !== "completed") return null;
  if ("source" in parsed && parsed.source !== "live") return null;
  if (parsed.locale !== undefined && parsed.locale !== locale) return null;
  try {
    return mapReviewBundle(parsed, {
      sessionId,
      locale,
      transcript: typeof parsed.transcript === "string" ? parsed.transcript : "",
      elapsedMs: typeof parsed.elapsedMs === "number" ? parsed.elapsedMs : 0,
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : undefined,
      llmUsed: parsed.llmUsed,
      fallbackReason: parsed.fallbackReason,
    });
  } catch {
    return null;
  }
}

export function readReviewBundleFromCache(sessionId: string, locale: GCCLocale = "en") {
  if (typeof window === "undefined") return null;

  try {
    for (const key of getCompatibleReviewCacheKeys(sessionId, locale)) {
      const serialized = localStorage.getItem(key);
      if (!serialized) continue;
      const bundle = normalizeStoredBundle(JSON.parse(serialized), sessionId, locale);
      if (!bundle) continue;
      if (key !== getReviewBundleStorageKey(sessionId, locale)) saveReviewBundleLocally(bundle, locale);
      return bundle;
    }
    return null;
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
    try {
      return mapReviewBundle(rawBundle, {
        sessionId,
        locale,
        transcript,
        elapsedMs,
        generatedAt: rawBundle?.generatedAt ?? value?.generated_at,
        llmUsed: value?.llm_used ?? rawBundle?.llmUsed,
        fallbackReason: value?.fallback_reason ?? rawBundle?.fallbackReason,
      });
    } catch {
      return null;
    }
  }

  const [soapNote, billingIntelligence, patientSummary] = await Promise.all([
    fetchGCCSoapNote(sessionId, locale),
    fetchGCCBillingIntelligence(sessionId, locale),
    fetchGCCPatientSummary(sessionId, locale),
  ]);

  if (!soapNote || !billingIntelligence || !patientSummary) return null;
  try {
    return mapReviewBundle({ soap_note: soapNote, billing_intelligence: billingIntelligence, patient_summary: patientSummary }, {
      sessionId,
      locale,
    });
  } catch {
    return null;
  }
}

function getLocaleQuery(locale: GCCLocale) {
  return new URLSearchParams({
    language: locale,
    locale: locale === "ar" ? "ar-SA" : "en-US",
  }).toString();
}

export async function fetchGCCSoapNote(sessionId: string, locale: GCCLocale = "en"): Promise<unknown | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(
    `${apiBaseUrl}/soap-notes/${encodeURIComponent(sessionId)}?${getLocaleQuery(locale)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const value = await response.json();
  return value?.soap_note ?? value;
}

export async function fetchGCCBillingIntelligence(sessionId: string, locale: GCCLocale = "en"): Promise<unknown | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(
    `${apiBaseUrl}/billing-intelligence/${encodeURIComponent(sessionId)}?${getLocaleQuery(locale)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const value = await response.json();
  return value?.billing_intelligence ?? value;
}

export async function fetchGCCPatientSummary(sessionId: string, locale: GCCLocale = "en"): Promise<unknown | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(
    `${apiBaseUrl}/patient-summary/${encodeURIComponent(sessionId)}?${getLocaleQuery(locale)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const value = await response.json();
  return value?.patient_summary ?? value;
}
