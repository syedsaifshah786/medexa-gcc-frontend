"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, PanelRightClose, X } from "lucide-react";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { SessionStatus } from "@/providers/GCCVoiceSessionProvider";
import type { GCCClaimReadiness, GCCLiveInsightsStatus } from "@/types/gcc-live-insights";

type Props = {
  readiness: GCCClaimReadiness | null;
  insightStatus: GCCLiveInsightsStatus;
  sessionStatus: SessionStatus;
  lastUpdatedAt: number | null;
  segmentCount: number;
  hasTranscript: boolean;
  sbsMatchCount: number;
};

function QualityRing() {
  const { t } = useGCCLocale();
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-full border-4 border-[#e8e9ff] bg-white text-[15px] font-medium text-[#777]" aria-label={t("session.claimQuality.scoreUnavailableTitle")}>
      —
    </span>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[#e2e3e8] bg-white px-3 text-[13px] font-medium text-[#33343a]">
      <i className="size-2 rounded-full bg-slate-300" aria-hidden="true" />
      {label}: {value}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-[54px] grid-cols-[1fr_auto] items-center gap-3 border-b border-[#eff0f3] py-3 last:border-b-0">
      <p className="text-[13px] font-medium text-[#24252a]">{label}</p>
      <span className="text-end text-[12px] font-medium text-[#6f7076]">{value}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <div className="min-h-[74px] rounded-[16px] bg-[#f1f3f1] px-4 py-3.5"><p className="text-[9px] font-medium text-[#64666c]">{label}</p><p className="mt-1 text-[18px] font-medium leading-tight text-[#27282d]">{value}</p></div>;
}

const subscribeToBrowser = () => () => undefined;

export default function GCCClaimQualityDropdown({ readiness, insightStatus, sessionStatus, lastUpdatedAt, segmentCount, hasTranscript, sbsMatchCount }: Props) {
  const { t, formatNumber } = useGCCLocale();
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeToBrowser, () => true, () => false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openItems = (readiness?.blockingIssues ?? 0) + (readiness?.warnings ?? 0);
  const compactStatus = !readiness
    ? t(hasTranscript ? "session.claimQuality.compact.evaluating" : "session.claimQuality.compact.awaiting")
    : readiness.blockingIssues > 0
      ? t("session.claimQuality.compact.blocking.other", { count: formatNumber(readiness.blockingIssues) })
      : readiness.warnings > 0
        ? t("session.claimQuality.compact.review.other", { count: formatNumber(readiness.warnings) })
        : t("session.claimQuality.compact.noIssues");

  const sessionLabel = t(sessionStatus === "recording"
    ? "session.claimQuality.session.active"
    : sessionStatus === "paused"
      ? "session.claimQuality.session.paused"
      : sessionStatus === "stopping"
        ? "session.claimQuality.session.finalizing"
        : sessionStatus === "starting"
          ? "session.claimQuality.session.starting"
          : sessionStatus === "error"
            ? "session.claimQuality.session.unavailable"
            : sessionStatus === "stopped"
              ? "session.claimQuality.session.stopped"
              : "session.claimQuality.session.inactive");
  const insightLabel = t(insightStatus === "analyzing"
    ? "session.claimQuality.insights.analyzing"
    : insightStatus === "paused"
      ? "session.claimQuality.insights.paused"
      : insightStatus === "unavailable"
        ? "session.claimQuality.insights.unavailable"
        : lastUpdatedAt
          ? "session.claimQuality.insights.current"
          : "session.claimQuality.insights.waiting");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  const drawer = mounted ? createPortal(
    <div className={`fixed inset-0 z-[200] transition-[visibility] duration-300 ${open ? "visible" : "invisible delay-300"}`} aria-hidden={!open}>
      <button type="button" tabIndex={open ? 0 : -1} aria-label={t("session.claimQuality.close")} onClick={() => setOpen(false)} className={`absolute inset-0 size-full bg-white/60 backdrop-blur-[6px] transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside id="gcc-claim-quality-panel" role="dialog" aria-modal="true" aria-labelledby="gcc-claim-quality-title" className={`absolute bottom-3 right-3 top-[76px] w-[min(478px,calc(100vw-24px))] overflow-hidden rounded-[20px] border border-[#dcdee5] bg-white shadow-[0_28px_90px_rgba(32,38,73,0.18)] transition-[transform,opacity] duration-300 sm:bottom-6 sm:right-6 sm:top-[98px] ${open ? "translate-x-0 opacity-100" : "translate-x-[calc(100%+32px)] opacity-0"}`}>
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex min-h-[82px] shrink-0 items-center gap-4 border-b border-[#eff0f3] px-6">
            <button ref={closeRef} type="button" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#dadee8] text-[#505572] transition hover:border-indigo-300 hover:bg-indigo-50" aria-label={t("session.claimQuality.close")}><PanelRightClose className="size-5" aria-hidden="true" /></button>
            <div className="flex min-w-0 flex-1 items-center gap-2"><i className={`size-2 rounded-full ${openItems ? "bg-amber-400" : readiness ? "bg-[#20c66b]" : "bg-slate-300"}`} aria-hidden="true" /><h2 id="gcc-claim-quality-title" className="text-[16px] font-medium text-[#1f2025]">{t("session.claimQuality.title")}</h2></div>
            <QualityRing />
          </header>
          <div className="gcc-insights-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-5">
            <p className="rounded-2xl bg-indigo-50/70 px-4 py-3 text-[13px] font-medium leading-5 text-[#30365f]">{readiness?.summary ?? "Claim quality is being evaluated."}</p>
            <section className="pt-6" aria-labelledby="compliance-title">
              <h3 id="compliance-title" className="border-b border-[#dedfe4] pb-2 text-[14px] font-normal text-[#75767b]">{t("session.claimQuality.complianceRcm")}</h3>
              <div className="flex flex-wrap gap-2 pt-4">
                <StatusPill label={t("session.claimQuality.preAuth")} value={t("session.claimQuality.notEvaluated")} />
                <StatusPill label={t("session.claimQuality.nphies")} value={t("session.claimQuality.notEvaluated")} />
                <StatusPill label={t("session.claimQuality.eligibility")} value={t("session.claimQuality.notEvaluated")} />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">{t("session.claimQuality.coverageNote")}</p>
            </section>
            <section className="pt-7" aria-labelledby="pipeline-title">
              <h3 id="pipeline-title" className="border-b border-[#dedfe4] pb-2 text-[14px] font-normal text-[#75767b]">{t("session.claimQuality.documentationPipeline")}</h3>
              <DetailRow label={t("session.claimQuality.transcriptStream")} value={segmentCount ? t("session.claimQuality.pipeline.segment.other", { count: formatNumber(segmentCount) }) : t("session.claimQuality.pipeline.waiting")} />
              <DetailRow label="SBS V3" value={sbsMatchCount ? formatNumber(sbsMatchCount) : t("session.claimQuality.pipeline.waiting")} />
              <DetailRow label={t("session.claimQuality.soapSynthesis")} value={sessionStatus === "stopping" ? t("session.claimQuality.processing") : t("session.claimQuality.afterStop")} />
            </section>
            <section className="pt-6" aria-labelledby="live-session-title">
              <h3 id="live-session-title" className="border-b border-[#dedfe4] pb-2 text-[14px] font-normal text-[#75767b]">{t("session.claimQuality.liveSession")}</h3>
              <DetailRow label={t("session.claimQuality.ambientStatus")} value={sessionLabel} />
              <DetailRow label={t("session.claimQuality.voiceProvider")} value={t("session.claimQuality.browserSpeech")} />
              <DetailRow label={t("session.claimQuality.liveInsights")} value={insightLabel} />
            </section>
            <section className="pt-5" aria-labelledby="metrics-title">
              <h3 id="metrics-title" className="border-b border-[#dedfe4] pb-2 text-[14px] font-normal text-[#75767b]">{t("session.claimQuality.healthMetrics")}</h3>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <MetricCard label={t("session.claimQuality.metric.blockingItems")} value={readiness ? formatNumber(readiness.blockingIssues) : t("session.claimQuality.metric.evaluating")} />
                <MetricCard label={t("session.claimQuality.metric.warnings")} value={readiness ? formatNumber(readiness.warnings) : t("session.claimQuality.metric.evaluating")} />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">{t("session.claimQuality.metric.noRisk")}</p>
            </section>
          </div>
        </div>
      </aside>
    </div>, document.body) : null;

  return (
    <div className="relative z-[70] shrink-0">
      <button ref={triggerRef} type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="dialog" aria-controls="gcc-claim-quality-panel" className="grid h-[64px] w-[clamp(210px,25vw,300px)] grid-cols-[56px_minmax(0,1fr)_60px] items-center overflow-hidden rounded-[17px] border border-[#dfe1e8] bg-white text-start shadow-[0_10px_28px_rgba(48,61,115,0.09)] transition hover:border-indigo-200 sm:h-[72px]">
        <span className="grid h-full place-items-center border-e border-[#dfe1e8] text-[#505572]">{open ? <X className="size-5" aria-hidden="true" /> : <ChevronLeft className="size-5" aria-hidden="true" />}</span>
        <span className="min-w-0 px-3"><strong className="block truncate text-[13px] font-medium text-[#202126] sm:text-[15px]">{t("session.claimQuality.title")}</strong><span className="mt-0.5 block truncate text-[9px] text-slate-500">{compactStatus}</span></span>
        <QualityRing />
      </button>
      {drawer}
    </div>
  );
}
