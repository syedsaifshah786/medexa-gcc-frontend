import type { TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";

export type GCCVoiceCommand =
  | "start-session"
  | "pause-recording"
  | "resume-recording"
  | "stop-recording";

const inlineEnglishCommandPatterns = [
  /\b(hey\s+)?medexa\s+start\s+(a\s+)?new\s+session\b/gi,
  /\b(hey\s+)?medexa\s+start\s+(recording|session)\b/gi,
  /\b(hey\s+)?medexa\s+begin\s+session\b/gi,
  /\b(hey\s+)?medexa\s+pause\s+(recording|session)\b/gi,
  /\b(hey\s+)?medexa\s+resume\s+(recording|session)?\b/gi,
  /\b(hey\s+)?medexa\s+(stop|end)\s+(recording|session)\b/gi,
];

const inlineArabicCommandPatterns = [
  /(?:يا\s+)?ميدي?كسا\s*[،,]?\s*(?:ابد(?:أ|ا|ئي)|بدء)\s+جلسة(?:\s+جديدة)?/giu,
  /(?:[أإا]وقف|توقف[ي]?)\s+الجلسة\s+مؤقت(?:ًا|اً|ا)?/giu,
  /(?:[إا]يقاف\s+مؤقت|است[أا]نف\s+الجلسة|استئناف\s+الجلسة|تابع\s+الجلسة|واصل[ي]?\s+الجلسة)/giu,
  /(?:[أإا]وقف|توقف)\s+(?:عن\s+)?(?:التسجيل|الجلسة)/giu,
  /(?:[أإا]نهِ?|[إا]نهاء)\s+الجلسة/giu,
];

const normalizeMedexaVariants = (text: string) => text.replace(/\b(madexa|med exa|med extra|mede?xa)\b/gi, "medexa");

const arabicDiacriticsPattern = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/gu;
const punctuationAndSymbolsPattern = /[\p{P}\p{S}]+/gu;

export function normalizeVoiceCommandText(text: string) {
  return normalizeMedexaVariants(text)
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(arabicDiacriticsPattern, "")
    .replace(/\u0640/gu, "")
    .replace(/[أإآٱ]/gu, "ا")
    .replace(punctuationAndSymbolsPattern, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseSet(phrases: readonly string[]) {
  return new Set(phrases.map(normalizeVoiceCommandText));
}

const ambientStartCommands = phraseSet([
  "hey medexa start a new session",
  "medexa start a new session",
  "hey medexa start new session",
  "medexa start new session",
  "hey medexa start session",
  "medexa start session",
  "hey medexa begin session",
  "medexa begin session",
  "start",
  "start new session",
  "يا ميدكسا، ابدئي جلسة جديدة",
  "يا ميدكسا، ابدأ جلسة جديدة",
  "يا ميديكسا، ابدئي جلسة جديدة",
  "يا ميديكسا، ابدأ جلسة جديدة",
  "ميدكسا، ابدأ جلسة",
  "ميديكسا، ابدأ جلسة",
  "ابدأ جلسة جديدة",
  "بدء جلسة جديدة",
]);

const pauseCommands = phraseSet([
  "hey medexa pause recording",
  "medexa pause recording",
  "hey medexa pause session",
  "medexa pause session",
  "pause recording",
  "pause session",
  "pause",
  "أوقف الجلسة مؤقتًا",
  "إيقاف مؤقت",
  "توقفي مؤقتًا",
  "توقف مؤقتًا",
]);

const resumeCommands = phraseSet([
  "hey medexa start recording",
  "medexa start recording",
  "hey medexa start session",
  "medexa start session",
  "hey medexa resume recording",
  "medexa resume recording",
  "hey medexa resume session",
  "medexa resume session",
  "resume recording",
  "resume session",
  "resume",
  "start",
  "استأنف الجلسة",
  "استئناف الجلسة",
  "تابع الجلسة",
  "واصلي الجلسة",
]);

const stopCommands = phraseSet([
  "hey medexa stop recording",
  "medexa stop recording",
  "hey medexa stop session",
  "medexa stop session",
  "hey medexa end recording",
  "medexa end recording",
  "hey medexa end session",
  "medexa end session",
  "stop recording",
  "stop session",
  "end recording",
  "end session",
  "stop",
  "end",
  "أوقف التسجيل",
  "أوقف الجلسة",
  "أنهِ الجلسة",
  "إنهاء الجلسة",
  "توقف عن التسجيل",
]);

function matchesAmbientStart(normalized: string) {
  if (ambientStartCommands.has(normalized)) return true;

  for (const phrase of ambientStartCommands) {
    if (
      normalized.startsWith(`${phrase} with `) ||
      normalized.startsWith(`${phrase} مع `)
    ) {
      return true;
    }
  }

  return false;
}

export function detectAmbientVoiceCommand(text: string): GCCVoiceCommand | null {
  const normalized = normalizeVoiceCommandText(text);
  return normalized && matchesAmbientStart(normalized) ? "start-session" : null;
}

export function detectSessionVoiceCommand(text: string): GCCVoiceCommand | null {
  const normalized = normalizeVoiceCommandText(text);
  if (!normalized) return null;
  if (stopCommands.has(normalized)) return "stop-recording";
  if (pauseCommands.has(normalized)) return "pause-recording";
  if (resumeCommands.has(normalized)) return "resume-recording";
  return null;
}

export function isKnownVoiceCommand(text: string) {
  const normalized = normalizeVoiceCommandText(text);
  return Boolean(
    normalized &&
      (matchesAmbientStart(normalized) ||
        pauseCommands.has(normalized) ||
        resumeCommands.has(normalized) ||
        stopCommands.has(normalized)),
  );
}

export function normalizeTranscript(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:،؛؟])/g, "$1")
    .replace(/([,.!?;:،؛؟])(?=\S)/g, "$1 ")
    .trim();
}

export function removeVoiceCommands(text: string) {
  if (isKnownVoiceCommand(text)) return "";
  const normalized = normalizeMedexaVariants(text);
  const withoutEnglishCommands = inlineEnglishCommandPatterns.reduce(
    (nextText, pattern) => nextText.replace(pattern, " "),
    normalized,
  );
  return normalizeTranscript(
    inlineArabicCommandPatterns.reduce(
      (nextText, pattern) => nextText.replace(pattern, " "),
      withoutEnglishCommands,
    ),
  );
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
    .split(/(?<=[.!?؟])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function dedupeSentences(text: string) {
  const seen = new Set<string>();
  const sentences = splitSentences(text);
  const unique = sentences.filter((sentence) => {
    const key = sentence
      .toLocaleLowerCase("und")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
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
