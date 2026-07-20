import { SBS_V3_INDEX } from "@/lib/sbs/sbs-index";
import { normalizeSBSText, normalizeSBSTextWithMap } from "@/lib/sbs/sbs-normalizer";
import type { SBSMatch } from "@/types/sbs-v3";

type Token = { value: string; start: number; end: number };

function tokenize(value: string): Token[] {
  const tokens: Token[] = [];
  const matcher = /\S+/gu;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(value))) {
    tokens.push({ value: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

function hasRequiredContext(tokens: readonly Token[], matchStart: number, matchEnd: number, contexts: readonly string[]) {
  if (contexts.length === 0) return true;
  const first = tokens.findIndex((token) => token.end > matchStart);
  let last = first;
  while (last + 1 < tokens.length && tokens[last + 1].start < matchEnd) last += 1;
  const start = Math.max(0, first - 10);
  const end = Math.min(tokens.length, last + 11);
  const window = ` ${tokens.slice(start, end).map((token) => token.value).join(" ")} `;
  return contexts.some((context) => window.includes(` ${context} `));
}

function hasExclusion(normalizedText: string, exclusions: readonly string[]) {
  const corpus = ` ${normalizedText} `;
  return exclusions.some((exclusion) => corpus.includes(` ${exclusion} `));
}

export function matchSBSInText(text: string, segmentId: string): SBSMatch[] {
  const normalized = normalizeSBSTextWithMap(text);
  if (!normalized.value) return [];
  const tokens = tokenize(normalized.value);
  const candidates: Array<Omit<SBSMatch, "id" | "detectedAt">> = [];

  tokens.forEach((token, tokenIndex) => {
    const phrases = SBS_V3_INDEX.phrasesByFirstToken.get(token.value);
    if (!phrases) return;
    phrases.forEach(({ phrase, tokenCount, record }) => {
      const finalToken = tokens[tokenIndex + tokenCount - 1];
      if (!finalToken) return;
      const matchedNormalizedText = normalized.value.slice(token.start, finalToken.end);
      if (matchedNormalizedText !== phrase) return;
      if (hasExclusion(normalized.value, record.exclusions)) return;
      if (!hasRequiredContext(tokens, token.start, finalToken.end, record.requiredContext)) return;
      const sourceStart = normalized.sourceIndexes[token.start];
      const sourceEndIndex = normalized.sourceIndexes[finalToken.end - 1];
      if (sourceStart === undefined || sourceEndIndex === undefined) return;
      const sourceEnd = sourceEndIndex + 1;
      candidates.push({
        segmentId,
        code: record.code,
        officialTitle: record.officialTitle,
        matchedText: text.slice(sourceStart, sourceEnd),
        normalizedMatch: normalizeSBSText(text.slice(sourceStart, sourceEnd)),
        start: sourceStart,
        end: sourceEnd,
        confidence: 1,
      });
    });
  });

  candidates.sort((left, right) => left.start - right.start || right.end - right.start - (left.end - left.start));
  const accepted: typeof candidates = [];
  candidates.forEach((candidate) => {
    if (accepted.some((match) => candidate.start < match.end && candidate.end > match.start)) return;
    accepted.push(candidate);
  });
  const detectedAt = new Date().toISOString();
  return accepted.map((match) => ({
    ...match,
    id: `${match.segmentId}:${match.code}:${match.start}:${match.end}`,
    detectedAt,
  }));
}
