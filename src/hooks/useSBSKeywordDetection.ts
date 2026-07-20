"use client";

import { useEffect, useMemo, useState } from "react";
import { matchSBSInText } from "@/lib/sbs/sbs-matcher";
import type { TranscriptSegment } from "@/providers/GCCVoiceSessionProvider";
import type { SBSMatch } from "@/types/sbs-v3";

const interimDebounceMs = 150;

export function useSBSKeywordDetection(
  segments: readonly TranscriptSegment[],
  interimTranscript: string,
) {
  const [interimMatches, setInterimMatches] = useState<SBSMatch[]>([]);

  // Finalized results are memoized by the immutable segment array. Interim
  // changes therefore never rescan any completed transcript segment.
  const finalizedMatches = useMemo(
    () => segments.filter((segment) => segment.isFinal).flatMap((segment) => matchSBSInText(segment.text, segment.id)),
    [segments],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInterimMatches(interimTranscript.trim() ? matchSBSInText(interimTranscript, "interim") : []);
    }, interimDebounceMs);
    return () => window.clearTimeout(timer);
  }, [interimTranscript]);

  const matches = [...finalizedMatches, ...interimMatches];
  const matchesBySegment = new Map<string, SBSMatch[]>();
  matches.forEach((match) => matchesBySegment.set(match.segmentId, [...(matchesBySegment.get(match.segmentId) ?? []), match]));

  return { matches, finalizedMatches, interimMatches, matchesBySegment };
}
