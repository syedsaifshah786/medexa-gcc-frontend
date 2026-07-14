"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import GCCClaimReadinessCard from "@/components/gcc/GCCClaimReadinessCard";
import GCCSuggestionCard from "@/components/gcc/GCCSuggestionCard";
import type { GCCClaimReadiness, GCCLiveSuggestion } from "@/types/gcc-live-insights";

export type GCCInsightsViewStatus = "idle" | "analyzing" | "updated" | "paused" | "unavailable";

type Props = {
  suggestions: GCCLiveSuggestion[];
  claimReadiness: GCCClaimReadiness | null;
  status: GCCInsightsViewStatus;
  lastUpdatedAt: number | null;
  hasTranscript: boolean;
  onApprove: (fingerprint: string) => void;
  onIgnore: (fingerprint: string) => void;
};

function statusCopy(status: GCCInsightsViewStatus, lastUpdatedAt: number | null) {
  if (status === "analyzing") return "Analyzing...";
  if (status === "paused") return "Paused";
  if (status === "unavailable") return "Live insights temporarily unavailable";
  if (lastUpdatedAt) return "Updated just now";
  return "Listening for transcript";
}

export default function GCCInsightsSheet({
  suggestions,
  claimReadiness,
  status,
  lastUpdatedAt,
  hasTranscript,
  onApprove,
  onIgnore,
}: Props) {
  const timersRef = useRef<number[]>([]);
  const [approvedFeedback, setApprovedFeedback] = useState<Set<string>>(() => new Set());
  const [ignoredExiting, setIgnoredExiting] = useState<Set<string>>(() => new Set());
  const activeSuggestions = useMemo(() => suggestions.filter((suggestion) => suggestion.status === "active"), [suggestions]);
  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === "active" || approvedFeedback.has(suggestion.fingerprint) || ignoredExiting.has(suggestion.fingerprint)),
    [approvedFeedback, ignoredExiting, suggestions],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const showApprovedFeedback = (fingerprint: string) => {
    setApprovedFeedback((current) => new Set(current).add(fingerprint));
    onApprove(fingerprint);
    const timer = window.setTimeout(() => {
      setApprovedFeedback((current) => {
        const next = new Set(current);
        next.delete(fingerprint);
        return next;
      });
    }, 1100);
    timersRef.current.push(timer);
  };

  const smoothlyIgnore = (fingerprint: string) => {
    setIgnoredExiting((current) => new Set(current).add(fingerprint));
    onIgnore(fingerprint);
    const timer = window.setTimeout(() => {
      setIgnoredExiting((current) => {
        const next = new Set(current);
        next.delete(fingerprint);
        return next;
      });
    }, 280);
    timersRef.current.push(timer);
  };

  return (
    <section
      aria-labelledby="insights-title"
      className="grid h-[clamp(360px,calc(100vh-330px),600px)] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/95 shadow-[0_16px_42px_rgba(37,48,93,0.08)]"
    >
      <header className="flex min-h-[68px] items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="insights-title" className="truncate text-[15px] font-extrabold text-slate-900">Real-Time Suggestions</h2>
              <p className={`mt-0.5 truncate text-[11px] font-semibold ${status === "unavailable" ? "text-amber-600" : status === "paused" ? "text-slate-400" : "text-indigo-500"}`} role="status" aria-live="polite">
                {statusCopy(status, lastUpdatedAt)}
              </p>
            </div>
          </div>
        </div>
        <strong className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1.5 text-[11px] font-extrabold text-indigo-700">
          {activeSuggestions.length} {activeSuggestions.length === 1 ? "Suggestion" : "Suggestions"}
        </strong>
      </header>

      <div className="gcc-insights-scroll min-h-0 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#fbfcff_0%,#f8fafc_100%)] px-3 py-3 sm:px-4" aria-live="polite">
        {visibleSuggestions.length > 0 ? (
          <div className="grid gap-3">
            {visibleSuggestions.map((suggestion) => (
              <GCCSuggestionCard
                key={suggestion.fingerprint}
                suggestion={suggestion}
                onApprove={showApprovedFeedback}
                onIgnore={smoothlyIgnore}
              />
            ))}
          </div>
        ) : (
          <div className="grid h-full min-h-[180px] place-items-center px-5 text-center">
            <div className="max-w-[340px]">
              <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-400">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-extrabold text-slate-700">
                {status === "analyzing" ? "Reviewing the latest transcript" : hasTranscript ? "No grounded suggestions detected yet" : "No live suggestions yet"}
              </h3>
              <p className="mt-1.5 text-[12px] leading-5 text-slate-500">
                {hasTranscript
                  ? "Existing insights will appear here only when supported by the conversation."
                  : "Start speaking to receive transcript-grounded clinical workflow suggestions."}
              </p>
            </div>
          </div>
        )}
      </div>

      <GCCClaimReadinessCard readiness={claimReadiness} isAnalyzing={status === "analyzing"} />
    </section>
  );
}
