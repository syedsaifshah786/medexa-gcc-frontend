"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, FileSearch, LoaderCircle } from "lucide-react";
import type { GCCInsightsViewStatus } from "@/components/gcc/GCCInsightsSheet";
import type { SessionStatus } from "@/providers/GCCVoiceSessionProvider";
import type { GCCClaimReadiness } from "@/types/gcc-live-insights";

type Props = {
  readiness: GCCClaimReadiness | null;
  insightStatus: GCCInsightsViewStatus;
  sessionStatus: SessionStatus;
  lastUpdatedAt: number | null;
};

function compactLabel(readiness: GCCClaimReadiness | null, insightStatus: GCCInsightsViewStatus) {
  if (insightStatus === "analyzing") return "Evaluating";
  if (!readiness) return "Pending";
  if (readiness.blockingIssues > 0) return `${readiness.blockingIssues} blocking`;
  if (readiness.warnings > 0) return `${readiness.warnings} for review`;
  return "No active issues";
}

function sessionStatusLabel(status: SessionStatus) {
  if (status === "recording") return "Listening";
  if (status === "paused") return "Paused";
  if (status === "stopping") return "Finalizing";
  if (status === "starting") return "Starting";
  if (status === "error") return "Microphone unavailable";
  if (status === "stopped") return "Stopped";
  return "Not recording";
}

function insightStatusLabel(status: GCCInsightsViewStatus) {
  if (status === "analyzing") return "Analyzing transcript";
  if (status === "paused") return "Paused with session";
  if (status === "unavailable") return "Temporarily unavailable";
  if (status === "updated") return "Current";
  return "Waiting for transcript";
}

export default function GCCClaimQualityDropdown({ readiness, insightStatus, sessionStatus, lastUpdatedAt }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasIssue = Boolean(readiness && (readiness.blockingIssues > 0 || readiness.warnings > 0));
  const StatusIcon = insightStatus === "analyzing" ? LoaderCircle : hasIssue ? AlertTriangle : readiness ? CheckCircle2 : FileSearch;

  useEffect(() => {
    if (!open) return;

    const handleOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handleOutsidePointer);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative z-[70] shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="gcc-claim-quality-panel"
        className="flex min-h-11 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-left shadow-[0_6px_18px_rgba(48,61,115,0.08)] transition hover:border-indigo-200 hover:shadow-md active:translate-y-px"
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-[10px] ${hasIssue ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>
          <StatusIcon className={`size-4 ${insightStatus === "analyzing" ? "animate-spin" : ""}`} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <strong className="block whitespace-nowrap text-[11px] font-extrabold text-slate-800">Claim Quality</strong>
          <span className="block whitespace-nowrap text-[10px] font-semibold text-slate-500">{compactLabel(readiness, insightStatus)}</span>
        </span>
        <ChevronDown className={`size-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          id="gcc-claim-quality-panel"
          role="region"
          aria-label="Claim Quality details"
          className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(360px,calc(100vw-2rem))] rounded-[18px] border border-slate-200/80 bg-white/98 p-4 shadow-[0_22px_65px_rgba(31,38,83,0.2)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className={`grid size-9 place-items-center rounded-xl ${hasIssue ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>
              <StatusIcon className={`size-[18px] ${insightStatus === "analyzing" ? "animate-spin" : ""}`} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Live documentation review</p>
              <h2 className="text-sm font-extrabold text-slate-900">Claim Quality</h2>
            </div>
          </div>

          <section className="border-b border-slate-100 py-3.5">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Current evaluation</h3>
            <p className="mt-2 text-[13px] font-semibold leading-5 text-slate-700">
              {readiness?.summary || "Claim quality is still being evaluated."}
            </p>
            {readiness && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-rose-50/70 p-3">
                  <span className="block text-[10px] font-bold text-rose-600">Blocking issues</span>
                  <strong className="mt-1 block text-xl text-rose-700">{readiness.blockingIssues}</strong>
                </div>
                <div className="rounded-xl bg-amber-50/80 p-3">
                  <span className="block text-[10px] font-bold text-amber-600">Warnings</span>
                  <strong className="mt-1 block text-xl text-amber-700">{readiness.warnings}</strong>
                </div>
              </div>
            )}
          </section>

          <section className="pt-3.5">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Live session</h3>
            <dl className="mt-2 space-y-2.5">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[11px] font-semibold text-slate-500">Ambient status</dt>
                <dd className="text-right text-[11px] font-extrabold text-slate-700">{sessionStatusLabel(sessionStatus)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[11px] font-semibold text-slate-500">Live insights</dt>
                <dd className={`text-right text-[11px] font-extrabold ${insightStatus === "unavailable" ? "text-amber-600" : "text-indigo-600"}`}>{insightStatusLabel(insightStatus)}</dd>
              </div>
              {lastUpdatedAt && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[11px] font-semibold text-slate-500">Latest analysis</dt>
                  <dd className="text-right text-[11px] font-extrabold text-emerald-600">Updated during this session</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
