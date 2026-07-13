import type { TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";
import { buildFinalTranscript, normalizeTranscript } from "@/lib/gcc/transcript-utils";

export type GCCSoapNote = {
  subjective: {
    chief_complaint: string;
    patient_narrative: string;
    symptoms: string[];
    history: string;
    reported_duration: string;
    pain_score: string;
    source_evidence: string[];
  };
  objective: {
    observations: string[];
    interventions: string[];
    functional_findings: string[];
    measurements: string[];
    source_evidence: string[];
  };
  assessment: {
    clinical_summary: string;
    response_to_treatment: string;
    functional_limitations: string[];
    progress: string;
    risks_or_flags: string[];
    source_evidence: string[];
  };
  plan: {
    next_steps: string[];
    home_program: string[];
    follow_up: string;
    frequency: string;
    clinician_actions_required: string[];
    source_evidence: string[];
  };
  clinician_review_required: boolean;
};

export type GCCFinalizeSessionResponse = {
  session_id: string;
  saved_to_store: boolean;
  llm_used: boolean;
  llm_fallback_reason: string | null;
  soap_note: GCCSoapNote;
};

type FinalizePayload = {
  sessionId: string;
  transcript: string;
  transcriptSegments: TranscriptSegment[];
  elapsedMs: number;
};

const fallbackText = "Requires clinician review";

export function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

export function getSoapStorageKey(sessionId: string) {
  return `medexa_gcc_soap_note_${sessionId}`;
}

export function getSoapMetaStorageKey(sessionId: string) {
  return `medexa_gcc_soap_meta_${sessionId}`;
}

export function createFallbackSoapNote(transcript: string): GCCSoapNote {
  const cleanTranscript = normalizeTranscript(transcript);
  const sentences = cleanTranscript.split(/(?<=[.!?])\s+/).filter(Boolean);
  const evidence = sentences.slice(0, 3);
  const symptomCandidates = sentences.filter((sentence) => /\b(pain|discomfort|stiff|tight|mobility|fatigue|weak|balance|sore)\b/i.test(sentence));
  const durationMatch = cleanTranscript.match(/\b(\d+\s*(days?|weeks?|months?)|two weeks|three weeks|fourteen days)\b/i);

  return {
    subjective: {
      chief_complaint: symptomCandidates[0] ?? fallbackText,
      patient_narrative: cleanTranscript || fallbackText,
      symptoms: symptomCandidates.length ? symptomCandidates.slice(0, 4) : [fallbackText],
      history: fallbackText,
      reported_duration: durationMatch?.[0] ?? fallbackText,
      pain_score: fallbackText,
      source_evidence: evidence,
    },
    objective: {
      observations: [fallbackText],
      interventions: [fallbackText],
      functional_findings: [fallbackText],
      measurements: [fallbackText],
      source_evidence: evidence,
    },
    assessment: {
      clinical_summary: cleanTranscript ? `Patient-reported concerns documented from transcript: ${cleanTranscript}` : fallbackText,
      response_to_treatment: fallbackText,
      functional_limitations: symptomCandidates.length ? symptomCandidates.slice(0, 3) : [fallbackText],
      progress: fallbackText,
      risks_or_flags: [fallbackText],
      source_evidence: evidence,
    },
    plan: {
      next_steps: [fallbackText],
      home_program: [fallbackText],
      follow_up: fallbackText,
      frequency: fallbackText,
      clinician_actions_required: ["Review generated SOAP note against source transcript."],
      source_evidence: evidence,
    },
    clinician_review_required: true,
  };
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

function validateFinalizeResponse(value: unknown): GCCFinalizeSessionResponse {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid finalize-session response.");
  }
  const response = value as Partial<GCCFinalizeSessionResponse>;
  if (response.saved_to_store !== true || !response.soap_note) {
    throw new Error("SOAP note was not saved by finalize-session.");
  }
  return response as GCCFinalizeSessionResponse;
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
    throw new Error("No clinical transcript was captured. Continue the session or enter a note before generating SOAP.");
  }

  if (!apiBaseUrl) {
    const soapNote = createFallbackSoapNote(transcript);
    return {
      session_id: payload.sessionId,
      saved_to_store: true,
      llm_used: false,
      llm_fallback_reason: "NEXT_PUBLIC_API_BASE_URL is not configured. Saved local transcript-grounded fallback.",
      soap_note: soapNote,
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
        generation_type: "soap_notes",
        require_transcript_grounding: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Finalize session failed with status ${response.status}.`);
    }

    return validateFinalizeResponse(await response.json());
  } catch (error) {
    const soapNote = createFallbackSoapNote(transcript);
    return {
      session_id: payload.sessionId,
      saved_to_store: true,
      llm_used: false,
      llm_fallback_reason: error instanceof Error ? error.message : "Backend unavailable. Saved local transcript-grounded fallback.",
      soap_note: soapNote,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchGCCSoapNote(sessionId: string) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  const response = await fetch(`${apiBaseUrl}/soap-notes/${encodeURIComponent(sessionId)}`);
  if (!response.ok) return null;
  const value = await response.json();
  if (value?.soap_note) return value.soap_note as GCCSoapNote;
  return value as GCCSoapNote;
}
