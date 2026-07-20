export type SBSV3Metadata = {
  file: string;
  version: string;
  date: string;
  match_strategy: string;
  context_rules: {
    trigger_phrases: string;
    required_context: string;
    exclude_if_present: string;
  };
  change_log: string;
};

export type SBSV3SourceRecord = {
  disciplines: string[];
  trigger_phrases: string[];
  exclude_if_present: string[];
  required_context: string[];
};

export type SBSV3Dataset = {
  _meta: SBSV3Metadata;
} & Record<string, SBSV3SourceRecord | SBSV3Metadata>;

export type SBSNormalizedRecord = {
  code: string;
  officialTitle: string;
  searchablePhrases: string[];
  requiredContext: string[];
  exclusions: string[];
  sourceRecord: SBSV3SourceRecord;
};

export type SBSMatch = {
  id: string;
  segmentId: string;
  code: string;
  officialTitle: string;
  matchedText: string;
  normalizedMatch: string;
  start: number;
  end: number;
  confidence: number;
  detectedAt: string;
};
