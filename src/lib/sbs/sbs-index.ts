import sbsSource from "@/data/sbs-v3.json";
import { normalizeSBSText } from "@/lib/sbs/sbs-normalizer";
import type { SBSNormalizedRecord, SBSV3Dataset, SBSV3SourceRecord } from "@/types/sbs-v3";

export type SBSIndexedPhrase = {
  phrase: string;
  tokenCount: number;
  record: SBSNormalizedRecord;
};

export type SBSIndex = {
  records: SBSNormalizedRecord[];
  phrasesByFirstToken: ReadonlyMap<string, readonly SBSIndexedPhrase[]>;
};

function isSourceRecord(value: unknown): value is SBSV3SourceRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SBSV3SourceRecord>;
  return Array.isArray(record.disciplines)
    && Array.isArray(record.trigger_phrases)
    && Array.isArray(record.exclude_if_present)
    && Array.isArray(record.required_context);
}

function uniqueNormalized(values: readonly string[]) {
  return [...new Set(values.map(normalizeSBSText).filter(Boolean))];
}

function buildSBSIndex(): SBSIndex {
  const dataset = sbsSource as SBSV3Dataset;
  const records = Object.entries(dataset).flatMap(([code, sourceRecord]) => {
    if (code === "_meta" || !isSourceRecord(sourceRecord)) return [];
    return [{
      code,
      // SBS V3 does not contain a separate procedure-title field. Its first
      // canonical trigger phrase is retained verbatim as the display title.
      officialTitle: sourceRecord.trigger_phrases[0] ?? code,
      searchablePhrases: uniqueNormalized(sourceRecord.trigger_phrases),
      requiredContext: uniqueNormalized(sourceRecord.required_context),
      exclusions: uniqueNormalized(sourceRecord.exclude_if_present),
      sourceRecord,
    }];
  });

  const mutable = new Map<string, SBSIndexedPhrase[]>();
  records.forEach((record) => {
    record.searchablePhrases.forEach((phrase) => {
      const firstToken = phrase.split(" ", 1)[0];
      if (!firstToken) return;
      const bucket = mutable.get(firstToken) ?? [];
      bucket.push({ phrase, tokenCount: phrase.split(" ").length, record });
      mutable.set(firstToken, bucket);
    });
  });
  mutable.forEach((phrases) => phrases.sort((left, right) => right.phrase.length - left.phrase.length));

  return { records, phrasesByFirstToken: mutable };
}

export const SBS_V3_INDEX = buildSBSIndex();
