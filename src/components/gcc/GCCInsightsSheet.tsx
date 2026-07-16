"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GCCSuggestionCard, {
  type GCCDemoSuggestionExit,
  type GCCDemoSuggestionKind,
} from "@/components/gcc/GCCSuggestionCard";

type LiveSuggestion = {
  id: string;
  kind: GCCDemoSuggestionKind;
  title: "Billing" | "Protocol Ask" | "Detected";
  message: string;
};

const initialSuggestions: LiveSuggestion[] = [
  {
    id: "protocol-family-history",
    kind: "protocol",
    title: "Protocol Ask",
    message: "Does anyone in your family have diabetes or vascular issues?",
  },
  {
    id: "billing-50115-00-00",
    kind: "billing",
    title: "Billing",
    message: "Code 50115-00-00 has been identified.",
  },
  {
    id: "detected-fatigue-lower-back-pain",
    kind: "detected",
    title: "Detected",
    message: "Patient reports persistent fatigue and lower back pain for 3 weeks.",
  },
  {
    id: "protocol-physical-activity",
    kind: "protocol",
    title: "Protocol Ask",
    message: "How often do you engage in physical activity each week?",
  },
  {
    id: "billing-96120-00-00",
    kind: "billing",
    title: "Billing",
    message: "Code 96120-00-00 has been identified.",
  },
  {
    id: "billing-22065-00-00",
    kind: "billing",
    title: "Billing",
    message: "Code 22065-00-00 has been identified.",
  },
];

function normalizeFingerprintPart(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("und").replace(/\s+/g, " ").trim();
}

function createSuggestionFingerprint(suggestion: LiveSuggestion) {
  return [suggestion.kind, suggestion.title, suggestion.message]
    .map(normalizeFingerprintPart)
    .join("|");
}

function deduplicateSuggestions(suggestions: readonly LiveSuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const fingerprint = createSuggestionFingerprint(suggestion);
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

export default function GCCInsightsSheet() {
  const timersRef = useRef<number[]>([]);
  const [suggestions, setSuggestions] = useState<LiveSuggestion[]>(initialSuggestions);
  const [exitStates, setExitStates] = useState<Record<string, GCCDemoSuggestionExit>>({});
  const uniqueSuggestions = useMemo(() => deduplicateSuggestions(suggestions), [suggestions]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const dismissSuggestion = useCallback((id: string, state: Exclude<GCCDemoSuggestionExit, null>) => {
    setExitStates((current) => ({ ...current, [id]: state }));
    const timer = window.setTimeout(() => {
      setSuggestions((current) => current.filter((suggestion) => suggestion.id !== id));
      setExitStates((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }, state === "approved" ? 720 : 320);
    timersRef.current.push(timer);
  }, []);

  return (
    <section aria-labelledby="insights-title" className="mx-auto w-full max-w-[720px]">
      <header className="mb-5 flex items-center justify-between gap-4 px-4 sm:px-16">
        <h2 id="insights-title" className="truncate text-[16px] font-normal text-[#8b8b91] sm:text-[18px]">
          Medexa is <span className="text-[#77777d]">Processing for Insights...</span>
        </h2>
        <p className="shrink-0 text-[16px] text-[#606067] sm:text-[18px]" aria-live="polite">
          <strong className="me-2 font-semibold text-[#17171b]">{uniqueSuggestions.length}</strong>
          Suggestions
        </p>
      </header>

      <div className="rounded-[35px] bg-gradient-to-br from-[#9ccfd4] via-[#a8b1ff] to-[#a8f24c] p-[2px] shadow-[0_24px_55px_rgba(36,58,120,0.08),0_0_32px_rgba(190,242,100,0.10)]">
        <div className="relative overflow-hidden rounded-[33px] bg-white">
          <div className="gcc-prototype-dots-soft pointer-events-none absolute inset-0 opacity-75" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 left-[15%] size-56 rounded-full bg-lime-200/25 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 right-[10%] size-56 rounded-full bg-cyan-200/20 blur-3xl" aria-hidden="true" />
          <span className="absolute left-1/2 top-5 z-10 h-2 w-[72px] -translate-x-1/2 rounded-full bg-[#d6d6d9] shadow-inner" aria-hidden="true" />

          <div className="gcc-insights-scroll relative h-[clamp(470px,62vh,690px)] overflow-y-auto overscroll-contain px-4 pb-10 pt-16 sm:px-12 sm:pb-12 sm:pt-20" aria-live="polite">
            <div className="mx-auto grid max-w-[570px] gap-7">
              {uniqueSuggestions.map((suggestion) => {
                const exitState = exitStates[suggestion.id] ?? null;
                return (
                  <div key={suggestion.id} className="relative ps-7 sm:ps-14">
                    <span className="pointer-events-none absolute start-0 top-0 h-11 w-7 rounded-es-[20px] border-b-2 border-s-2 border-dashed border-[#91b7ff] sm:w-10" aria-hidden="true" />
                    <GCCSuggestionCard
                      id={suggestion.id}
                      kind={suggestion.kind}
                      message={suggestion.message}
                      exitState={exitState}
                      onApprove={(id) => dismissSuggestion(id, "approved")}
                      onIgnore={(id) => dismissSuggestion(id, "ignored")}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
