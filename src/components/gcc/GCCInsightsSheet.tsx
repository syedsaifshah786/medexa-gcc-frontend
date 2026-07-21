"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GCCSuggestionCard, { type GCCDemoSuggestionExit } from "@/components/gcc/GCCSuggestionCard";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { GCCLiveInsightsStatus, GCCLiveSuggestion } from "@/types/gcc-live-insights";

type Props = {
  activeSuggestions: GCCLiveSuggestion[];
  status: GCCLiveInsightsStatus;
  lastUpdatedAt: number | null;
  hasTranscript: boolean;
  onApprove: (fingerprint: string) => void;
  onIgnore: (fingerprint: string) => void;
};

export default function GCCInsightsSheet({ activeSuggestions, status, lastUpdatedAt, hasTranscript, onApprove, onIgnore }: Props) {
  const { t, formatNumber } = useGCCLocale();
  const timersRef = useRef<number[]>([]);
  const [exitStates, setExitStates] = useState<Record<string, GCCDemoSuggestionExit>>({});
  const [exitingSuggestions, setExitingSuggestions] = useState<Record<string, GCCLiveSuggestion>>({});
  const visibleSuggestions = useMemo(
    () => [
      ...activeSuggestions,
      ...Object.values(exitingSuggestions).filter(
        (suggestion) => !activeSuggestions.some((active) => active.fingerprint === suggestion.fingerprint),
      ),
    ],
    [activeSuggestions, exitingSuggestions],
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[GCC live insights] cards rendered", {
      activeSuggestionCount: activeSuggestions.length,
      renderedSuggestionCount: visibleSuggestions.length,
    });
  }, [activeSuggestions.length, visibleSuggestions.length]);

  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  const dismissSuggestion = (fingerprint: string, nextState: Exclude<GCCDemoSuggestionExit, null>) => {
    const exiting = activeSuggestions.find((suggestion) => suggestion.fingerprint === fingerprint);
    if (exiting) setExitingSuggestions((current) => ({ ...current, [fingerprint]: exiting }));
    setExitStates((current) => ({ ...current, [fingerprint]: nextState }));
    if (nextState === "approved") onApprove(fingerprint);
    else onIgnore(fingerprint);
    const timer = window.setTimeout(() => {
      setExitStates((current) => {
        const next = { ...current };
        delete next[fingerprint];
        return next;
      });
      setExitingSuggestions((current) => {
        const next = { ...current };
        delete next[fingerprint];
        return next;
      });
    }, nextState === "approved" ? 900 : 320);
    timersRef.current.push(timer);
  };

  const headline = status === "paused"
    ? t("session.insights.headline.paused")
    : status === "unavailable"
      ? t("session.insights.headline.unavailable")
      : t("session.insights.headline.processing");
  const statusText = status === "analyzing"
    ? t("session.insights.status.analyzing")
    : status === "retrying"
      ? t("session.insights.status.retrying")
    : status === "paused"
      ? t("session.insights.status.paused")
      : status === "unavailable"
        ? t("session.insights.status.unavailable")
        : lastUpdatedAt
          ? t("session.insights.status.updated")
          : t("session.insights.status.listening");

  return (
    <section aria-labelledby="insights-title" className="mx-auto w-full max-w-[720px]">
      <header className="mb-5 flex items-start justify-between gap-4 px-4 sm:px-16">
        <div className="min-w-0">
          <h2 id="insights-title" className="truncate text-[16px] font-normal text-[#8b8b91] sm:text-[18px]">{headline}</h2>
          <p role="status" className="mt-1 text-[11px] font-medium text-indigo-500">{statusText}</p>
        </div>
        <p className="shrink-0 text-[16px] text-[#606067] sm:text-[18px]" aria-live="polite">
          <strong className="me-2 font-semibold text-[#17171b]">{formatNumber(visibleSuggestions.length)}</strong>
          {t("session.insights.suggestionCount.other", { count: "" }).trim()}
        </p>
      </header>

      <div className="rounded-[35px] bg-gradient-to-br from-[#9ccfd4] via-[#a8b1ff] to-[#a8f24c] p-[2px] shadow-[0_24px_55px_rgba(36,58,120,0.08),0_0_32px_rgba(190,242,100,0.10)]">
        <div className="relative overflow-hidden rounded-[33px] bg-white">
          <div className="gcc-prototype-dots-soft pointer-events-none absolute inset-0 opacity-75" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 left-[15%] size-56 rounded-full bg-lime-200/25 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 right-[10%] size-56 rounded-full bg-cyan-200/20 blur-3xl" aria-hidden="true" />
          <span className="absolute left-1/2 top-5 z-10 h-2 w-[72px] -translate-x-1/2 rounded-full bg-[#d6d6d9] shadow-inner" aria-hidden="true" />

          <div className="gcc-insights-scroll relative h-[clamp(470px,62vh,690px)] overflow-y-auto overscroll-contain px-4 pb-10 pt-16 sm:px-12 sm:pb-12 sm:pt-20" aria-live="polite">
            {visibleSuggestions.length > 0 ? (
              <div className="mx-auto grid max-w-[570px] gap-7">
                {visibleSuggestions.map((suggestion) => (
                  <div key={suggestion.fingerprint} className="relative ps-7 sm:ps-14">
                    <span className="pointer-events-none absolute start-0 top-0 h-11 w-7 rounded-es-[20px] border-b-2 border-s-2 border-dashed border-[#91b7ff] sm:w-10" aria-hidden="true" />
                    <GCCSuggestionCard suggestion={suggestion} exitState={exitStates[suggestion.fingerprint] ?? null} onApprove={(id) => dismissSuggestion(id, "approved")} onIgnore={(id) => dismissSuggestion(id, "ignored")} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid h-full min-h-[260px] place-items-center px-6 text-center">
                <div className="max-w-[360px] rounded-3xl bg-white/75 px-6 py-7 shadow-sm">
                  <h3 className="text-[15px] font-bold text-[#171b32]">Listening for clinical insights...</h3>
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">
                    {hasTranscript ? t("session.insights.empty.groundedHint") : t("session.insights.empty.startHint")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
