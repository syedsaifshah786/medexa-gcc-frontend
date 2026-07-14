"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CirclePause, Sparkles, WifiOff } from "lucide-react";
import GCCClaimReadinessCard from "@/components/gcc/GCCClaimReadinessCard";
import GCCSuggestionCard from "@/components/gcc/GCCSuggestionCard";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import { GCC_LOCALE_TAGS } from "@/lib/i18n/formatters";
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

export default function GCCInsightsSheet({
  suggestions,
  claimReadiness,
  status,
  lastUpdatedAt,
  hasTranscript,
  onApprove,
  onIgnore,
}: Props) {
  const { locale, t, formatNumber } = useGCCLocale();
  const timersRef = useRef<number[]>([]);
  const suggestionNodesRef = useRef(new Map<string, HTMLDivElement>());
  const [approvedFeedback, setApprovedFeedback] = useState<Set<string>>(() => new Set());
  const [ignoredExiting, setIgnoredExiting] = useState<Set<string>>(() => new Set());
  const activeSuggestions = useMemo(() => suggestions.filter((suggestion) => suggestion.status === "active"), [suggestions]);
  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === "active" || approvedFeedback.has(suggestion.fingerprint) || ignoredExiting.has(suggestion.fingerprint)),
    [approvedFeedback, ignoredExiting, suggestions],
  );
  const firstClaimIssue = useMemo(
    () => activeSuggestions.find((suggestion) => suggestion.claimImpact !== "none") ?? null,
    [activeSuggestions],
  );
  const readinessInsertAfter = useMemo(() => {
    if (!claimReadiness || visibleSuggestions.length === 0) return -1;
    const firstClaimIndex = visibleSuggestions.findIndex((suggestion) => suggestion.claimImpact !== "none");
    return firstClaimIndex >= 0 ? firstClaimIndex : Math.min(1, visibleSuggestions.length - 1);
  }, [claimReadiness, visibleSuggestions]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

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

  const focusFirstClaimIssue = () => {
    if (!firstClaimIssue) return;
    const node = suggestionNodesRef.current.get(firstClaimIssue.fingerprint);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => node.focus({ preventScroll: true }), 350);
  };

  const hasReadinessIssues = Boolean(claimReadiness && (claimReadiness.blockingIssues > 0 || claimReadiness.warnings > 0));
  const StatusIcon = status === "unavailable" ? WifiOff : status === "paused" ? CirclePause : Sparkles;
  const headline =
    status === "paused"
      ? t("session.insights.headline.paused")
      : status === "unavailable"
        ? t("session.insights.headline.unavailable")
        : t("session.insights.headline.processing");
  const statusLabel =
    status === "analyzing"
      ? t("session.insights.status.analyzing")
      : status === "paused"
        ? t("session.insights.status.paused")
        : status === "unavailable"
          ? t("session.insights.status.unavailable")
          : lastUpdatedAt
            ? t("session.insights.status.updated")
            : t("session.insights.status.listening");
  const suggestionPlural = new Intl.PluralRules(GCC_LOCALE_TAGS[locale]).select(activeSuggestions.length);
  const suggestionCount = t(`session.insights.suggestionCount.${suggestionPlural}`, {
    count: formatNumber(activeSuggestions.length),
  });

  return (
    <section aria-labelledby="insights-title" className="mx-auto w-full max-w-[760px]">
      <header className="mb-4 flex items-end justify-between gap-4 px-2 sm:px-7">
        <div className="min-w-0">
          <h2 id="insights-title" className="truncate text-[15px] font-medium text-slate-500 sm:text-[18px]">
            {headline}
          </h2>
          <p
            className={`mt-1 inline-flex items-center gap-1.5 text-[10px] font-semibold sm:text-[11px] ${status === "unavailable" ? "text-amber-600" : "text-slate-400"}`}
            role="status"
            aria-live="polite"
          >
            <StatusIcon className={`size-3 ${status === "analyzing" ? "animate-pulse" : ""}`} aria-hidden="true" />
            {statusLabel}
          </p>
        </div>
        <p className="shrink-0 text-[15px] text-slate-600 sm:text-[18px]">
          {suggestionCount}
        </p>
      </header>

      <div className="rounded-[34px] bg-gradient-to-br from-cyan-300/70 via-indigo-300/65 to-lime-300/80 p-[2px] shadow-[0_22px_55px_rgba(36,58,120,0.10),0_0_30px_rgba(190,242,100,0.10)]">
        <div className="relative overflow-hidden rounded-[32px] bg-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(99, 102, 241, 0.20) 1px, transparent 1.2px)",
              backgroundPosition: "0 0",
              backgroundSize: "8px 8px",
            }}
          />
          <div className="pointer-events-none absolute inset-x-[12%] top-0 h-20 bg-gradient-to-b from-white via-white/75 to-transparent" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-16 left-[14%] size-48 rounded-full bg-lime-200/20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 right-[12%] size-52 rounded-full bg-cyan-200/20 blur-3xl" aria-hidden="true" />

          <span className="absolute left-1/2 top-5 z-10 h-2 w-[72px] -translate-x-1/2 rounded-full bg-slate-300/70 shadow-inner" aria-hidden="true" />

          <div className="gcc-insights-scroll relative h-[clamp(430px,62vh,720px)] overflow-y-auto overscroll-contain px-3 pb-8 pt-16 sm:px-8 sm:pb-11 sm:pt-20" aria-live="polite">
            {visibleSuggestions.length > 0 ? (
              <div className="mx-auto grid max-w-[620px] gap-5 sm:gap-7">
                {visibleSuggestions.map((suggestion, index) => (
                  <div key={suggestion.fingerprint}>
                    <div
                      ref={(node) => {
                        if (node) suggestionNodesRef.current.set(suggestion.fingerprint, node);
                        else suggestionNodesRef.current.delete(suggestion.fingerprint);
                      }}
                      tabIndex={-1}
                      className="relative ps-6 outline-none focus-visible:rounded-[24px] focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-4 focus-visible:ring-offset-white sm:ps-14"
                    >
                      <span className="pointer-events-none absolute start-0 top-0 h-11 w-5 rounded-es-[20px] border-b-2 border-s-2 border-dashed border-indigo-300 sm:w-10" aria-hidden="true" />
                      <GCCSuggestionCard suggestion={suggestion} onApprove={showApprovedFeedback} onIgnore={smoothlyIgnore} />
                    </div>

                    {claimReadiness && readinessInsertAfter === index && (
                      <div className="relative mt-5 ps-6 sm:mt-7 sm:ps-14">
                        <span className="pointer-events-none absolute start-0 top-0 h-11 w-5 rounded-es-[20px] border-b-2 border-s-2 border-dashed border-indigo-300 sm:w-10" aria-hidden="true" />
                        <GCCClaimReadinessCard
                          readiness={claimReadiness}
                          isAnalyzing={status === "analyzing"}
                          onImprove={firstClaimIssue ? focusFirstClaimIssue : undefined}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid h-full min-h-[300px] place-items-center px-5 text-center">
                <div className="max-w-[360px] rounded-[24px] border border-white/90 bg-white/85 px-7 py-8 shadow-[0_16px_44px_rgba(50,62,110,0.08)] backdrop-blur-sm">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-500 shadow-sm">
                    <Sparkles className={`size-5 ${status === "analyzing" ? "animate-pulse" : ""}`} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-extrabold text-slate-800">
                    {status === "analyzing"
                      ? t("session.insights.empty.reviewing")
                      : hasTranscript
                        ? t("session.insights.empty.noGrounded")
                        : t("session.insights.empty.noLive")}
                  </h3>
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">
                    {hasTranscript
                      ? t("session.insights.empty.groundedHint")
                      : t("session.insights.empty.startHint")}
                  </p>
                </div>
              </div>
            )}

            {visibleSuggestions.length === 0 && claimReadiness && hasReadinessIssues && (
              <div className="mx-auto mt-5 max-w-[540px]">
                <GCCClaimReadinessCard readiness={claimReadiness} isAnalyzing={status === "analyzing"} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
