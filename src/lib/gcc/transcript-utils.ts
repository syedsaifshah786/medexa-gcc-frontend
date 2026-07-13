import type { TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";

const commandPatterns = [
  /\b(hey\s+)?medexa\s+start\s+(a\s+)?new\s+session\b/gi,
  /\b(hey\s+)?medexa\s+start\s+(recording|session)\b/gi,
  /\b(hey\s+)?medexa\s+begin\s+session\b/gi,
  /\b(hey\s+)?medexa\s+pause\s+(recording|session)\b/gi,
  /\b(hey\s+)?medexa\s+resume\s+(recording|session)?\b/gi,
  /\b(hey\s+)?medexa\s+(stop|end)\s+(recording|session)\b/gi,
];

const normalizeMedexaVariants = (text: string) => text.replace(/\b(madexa|med exa|med extra|mede?xa)\b/gi, "medexa");

export function normalizeTranscript(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?=\S)/g, "$1 ")
    .trim();
}

export function removeVoiceCommands(text: string) {
  const normalized = normalizeMedexaVariants(text);
  return normalizeTranscript(commandPatterns.reduce((nextText, pattern) => nextText.replace(pattern, " "), normalized));
}

export function deduplicateTranscriptSegments(segments: TranscriptSegment[]) {
  const seen = new Set<string>();
  return segments.filter((segment) => {
    const text = normalizeTranscript(removeVoiceCommands(segment.text)).toLowerCase();
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

function splitSentences(text: string) {
  return normalizeTranscript(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function dedupeSentences(text: string) {
  const seen = new Set<string>();
  const sentences = splitSentences(text);
  const unique = sentences.filter((sentence) => {
    const key = sentence.toLowerCase().replace(/[^\w\s]/g, "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.length ? unique.join(" ") : normalizeTranscript(text);
}

export function buildFinalTranscript({
  finalTranscript,
  transcriptSegments,
  interimTranscript,
  latestHeardText,
}: {
  finalTranscript: string;
  transcriptSegments: TranscriptSegment[];
  interimTranscript: string;
  latestHeardText: string;
}) {
  const segmentText = deduplicateTranscriptSegments(transcriptSegments)
    .filter((segment) => segment.isFinal)
    .map((segment) => segment.text)
    .join(" ");
  const baseTranscript = finalTranscript.trim() || segmentText.trim() || latestHeardText.trim();
  const cleanedBase = removeVoiceCommands(baseTranscript);
  const cleanedInterim = removeVoiceCommands(interimTranscript);
  const withInterim =
    cleanedInterim && !cleanedBase.toLowerCase().includes(cleanedInterim.toLowerCase())
      ? `${cleanedBase} ${cleanedInterim}`
      : cleanedBase;

  return dedupeSentences(removeVoiceCommands(withInterim));
}
