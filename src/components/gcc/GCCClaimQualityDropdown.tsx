"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronRight,
  LoaderCircle,
  PanelRightClose,
} from "lucide-react";
import type { GCCInsightsViewStatus } from "@/components/gcc/GCCInsightsSheet";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { GCCLocaleContextValue } from "@/i18n/types";
import type { SessionStatus } from "@/providers/GCCVoiceSessionProvider";
import type { GCCClaimReadiness } from "@/types/gcc-live-insights";

type Props = {
  readiness: GCCClaimReadiness | null;
  insightStatus: GCCInsightsViewStatus;
  sessionStatus: SessionStatus;
  lastUpdatedAt: number | null;
  transcriptSegmentCount?: number;
};

type StatusTone = "green" | "amber" | "red" | "slate" | "indigo";

type Translate = GCCLocaleContextValue["t"];
type FormatNumber = GCCLocaleContextValue["formatNumber"];

function compactLabel(
  readiness: GCCClaimReadiness | null,
  insightStatus: GCCInsightsViewStatus,
  t: Translate,
  formatNumber: FormatNumber,
) {
  if (insightStatus === "analyzing") return t("session.claimQuality.compact.evaluating");
  if (!readiness) return t("session.claimQuality.compact.awaiting");
  if (readiness.blockingIssues > 0) {
    return t(
      readiness.blockingIssues === 1
        ? "session.claimQuality.compact.blocking.one"
        : "session.claimQuality.compact.blocking.other",
      { count: formatNumber(readiness.blockingIssues) },
    );
  }
  if (readiness.warnings > 0) {
    return t(
      readiness.warnings === 1
        ? "session.claimQuality.compact.review.one"
        : "session.claimQuality.compact.review.other",
      { count: formatNumber(readiness.warnings) },
    );
  }
  return t("session.claimQuality.compact.noIssues");
}

function sessionStatusLabel(status: SessionStatus, t: Translate) {
  if (status === "recording") return t("session.claimQuality.session.active");
  if (status === "paused") return t("session.claimQuality.session.paused");
  if (status === "stopping") return t("session.claimQuality.session.finalizing");
  if (status === "starting") return t("session.claimQuality.session.starting");
  if (status === "error") return t("session.claimQuality.session.unavailable");
  if (status === "stopped") return t("session.claimQuality.session.stopped");
  return t("session.claimQuality.session.inactive");
}

function insightStatusLabel(status: GCCInsightsViewStatus, t: Translate) {
  if (status === "analyzing") return t("session.claimQuality.insights.analyzing");
  if (status === "paused") return t("session.claimQuality.insights.paused");
  if (status === "unavailable") return t("session.claimQuality.insights.unavailable");
  if (status === "updated") return t("session.claimQuality.insights.current");
  return t("session.claimQuality.insights.waiting");
}

function sessionTone(status: SessionStatus): StatusTone {
  if (status === "recording") return "green";
  if (status === "paused" || status === "stopping" || status === "starting") return "amber";
  if (status === "error") return "red";
  return "slate";
}

const toneClasses: Record<StatusTone, { dot: string; text: string; badge: string }> = {
  green: { dot: "bg-emerald-500", text: "text-emerald-600", badge: "border-emerald-200 bg-emerald-50/70" },
  amber: { dot: "bg-amber-400", text: "text-amber-600", badge: "border-amber-200 bg-amber-50/70" },
  red: { dot: "bg-rose-500", text: "text-rose-600", badge: "border-rose-200 bg-rose-50/70" },
  slate: { dot: "bg-slate-300", text: "text-slate-500", badge: "border-slate-200 bg-white" },
  indigo: { dot: "bg-indigo-500", text: "text-indigo-600", badge: "border-indigo-200 bg-indigo-50/60" },
};

function ComplianceChip({ label, value, tone = "slate" }: { label: string; value: string; tone?: StatusTone }) {
  const colors = toneClasses[tone];

  return (
    <span className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 ${colors.badge}`}>
      <span className={`size-2 shrink-0 rounded-full ${colors.dot}`} aria-hidden="true" />
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <span className="text-[9px] font-medium uppercase tracking-[0.04em] text-slate-400">{value}</span>
    </span>
  );
}

function PipelineRow({
  label,
  state,
  detail,
  tone = "slate",
}: {
  label: string;
  state: string;
  detail?: string;
  tone?: StatusTone;
}) {
  return (
    <div className="grid min-h-[58px] grid-cols-[1fr_auto] items-center gap-5 border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-[13px] font-semibold text-slate-800">{label}</p>
      <div className="flex items-center gap-3 text-end">
        <span className={`text-[12px] font-medium ${toneClasses[tone].text}`}>{state}</span>
        {detail && <span className="min-w-14 border-s border-slate-200 ps-3 text-[11px] font-semibold text-slate-500">{detail}</span>}
      </div>
    </div>
  );
}

function transcriptPipeline(
  status: SessionStatus,
  t: Translate,
  formatNumber: FormatNumber,
  segmentCount?: number,
) {
  const hasKnownTranscript = typeof segmentCount === "number";
  const hasSegments = hasKnownTranscript && segmentCount > 0;
  const segmentDetail = hasKnownTranscript
    ? t(
        segmentCount === 1
          ? "session.claimQuality.pipeline.segment.one"
          : "session.claimQuality.pipeline.segment.other",
        { count: formatNumber(segmentCount) },
      )
    : undefined;

  if (status === "recording") {
    return {
      state: hasSegments
        ? t("session.claimQuality.pipeline.streaming")
        : t("session.claimQuality.pipeline.listening"),
      detail: segmentDetail || t("session.claimQuality.pipeline.live"),
      tone: "green" as const,
    };
  }
  if (status === "paused") {
    return { state: t("session.claimQuality.pipeline.paused"), detail: segmentDetail, tone: "amber" as const };
  }
  if (status === "stopping") {
    return { state: t("session.claimQuality.pipeline.finalizing"), detail: segmentDetail, tone: "amber" as const };
  }
  if (status === "stopped" && hasSegments) {
    return { state: t("session.claimQuality.pipeline.complete"), detail: segmentDetail, tone: "green" as const };
  }
  if (status === "error") {
    return { state: t("session.claimQuality.pipeline.interrupted"), detail: segmentDetail, tone: "red" as const };
  }
  return {
    state: hasSegments
      ? t("session.claimQuality.pipeline.captured")
      : t("session.claimQuality.pipeline.waiting"),
    detail: segmentDetail,
    tone: hasSegments ? ("indigo" as const) : ("slate" as const),
  };
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-h-[76px] rounded-2xl bg-[#f4f6f5] px-4 py-3.5">
      <p className="text-[9px] font-medium uppercase tracking-[0.05em] text-slate-500">{label}</p>
      <p className="mt-1 text-[18px] font-medium leading-none text-slate-800" dir="auto">{value}</p>
      {detail && <p className="mt-1.5 text-[10px] leading-4 text-slate-500" dir="auto">{detail}</p>}
    </div>
  );
}

export default function GCCClaimQualityDropdown({
  readiness,
  insightStatus,
  sessionStatus,
  lastUpdatedAt,
  transcriptSegmentCount,
}: Props) {
  const { direction, t, formatNumber } = useGCCLocale();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const issueCount = (readiness?.blockingIssues ?? 0) + (readiness?.warnings ?? 0);
  const hasIssue = issueCount > 0;
  const transcript = transcriptPipeline(sessionStatus, t, formatNumber, transcriptSegmentCount);
  const ambientTone = sessionTone(sessionStatus);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      (previouslyFocused || trigger)?.focus();
    };
  }, [open]);

  const indicatorContent = insightStatus === "analyzing" ? (
    <LoaderCircle className="size-4 animate-spin text-indigo-600" aria-hidden="true" />
  ) : readiness ? (
    hasIssue ? (
      <span className="text-sm font-bold text-slate-800">{formatNumber(issueCount)}</span>
    ) : (
      <Check className="size-4 text-emerald-600" aria-hidden="true" />
    )
  ) : (
    <span className="text-base font-medium text-slate-400" aria-hidden="true">—</span>
  );

  const qualityMetric = insightStatus === "analyzing"
    ? t("session.claimQuality.metric.evaluating")
    : readiness
      ? hasIssue
        ? t("session.claimQuality.metric.open", { count: formatNumber(issueCount) })
        : t("session.claimQuality.metric.noOpen")
      : t("session.claimQuality.metric.notScored");
  const qualityDetail = readiness?.summary || t("session.claimQuality.metric.updatesHint");
  const scoreAriaLabel = readiness
    ? t("session.claimQuality.openItemsNoScore", { count: formatNumber(issueCount) })
    : t("session.claimQuality.scoreUnavailable");
  const expandedPanel = open && typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[200]" aria-hidden={false}>
          <div
            className="gcc-backdrop-enter absolute inset-0 bg-white/55 backdrop-blur-[5px]"
            aria-hidden="true"
            onPointerDown={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            id="gcc-claim-quality-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gcc-claim-quality-title"
            aria-describedby="gcc-claim-quality-description"
            className="gcc-panel-enter absolute inset-x-3 bottom-3 top-[76px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(32,38,73,0.2)] sm:inset-x-auto sm:bottom-6 sm:end-6 sm:top-[92px] sm:w-[min(478px,calc(100vw-48px))]"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex h-full min-h-0 flex-col">
              <header className="flex min-h-[82px] shrink-0 items-center border-b border-slate-100 px-5 sm:px-6">
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="me-4 grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label={t("session.claimQuality.close")}
                >
                  <PanelRightClose className={`size-[19px] ${direction === "rtl" ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${hasIssue ? "bg-amber-400" : readiness ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden="true" />
                    <h2 id="gcc-claim-quality-title" className="text-[17px] font-medium text-slate-950">{t("session.claimQuality.title")}</h2>
                  </div>
                  <p id="gcc-claim-quality-description" className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
                    {compactLabel(readiness, insightStatus, t, formatNumber)}
                  </p>
                </div>
                <div
                  className={`relative ms-3 grid size-12 shrink-0 place-items-center rounded-full border-[4px] bg-white ${hasIssue ? "border-amber-400 border-e-amber-100" : readiness ? "border-indigo-600 border-e-indigo-100" : "border-slate-200 border-e-indigo-400"}`}
                  title={t("session.claimQuality.scoreUnavailableTitle")}
                  aria-label={scoreAriaLabel}
                >
                  {indicatorContent}
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 sm:px-6">
                <section className="pt-5" aria-labelledby="gcc-compliance-heading">
                  <h3 id="gcc-compliance-heading" className="border-b border-slate-200 pb-2 text-[14px] font-medium text-slate-500">{t("session.claimQuality.complianceRcm")}</h3>
                  <div className="flex flex-wrap gap-2 pt-3">
                    <ComplianceChip label={t("session.claimQuality.preAuth")} value={t("session.claimQuality.notEvaluated")} />
                    <ComplianceChip label={t("session.claimQuality.nphies")} value={t("session.claimQuality.notEvaluated")} />
                    <ComplianceChip label={t("session.claimQuality.eligibility")} value={t("session.claimQuality.notEvaluated")} />
                    <ComplianceChip
                      label={t("session.claimQuality.liveReview")}
                      value={readiness
                        ? t(
                            issueCount === 1
                              ? "session.claimQuality.item.one"
                              : "session.claimQuality.item.other",
                            { count: formatNumber(issueCount) },
                          )
                        : t("session.claimQuality.pending")}
                      tone={hasIssue ? "amber" : readiness ? "green" : "slate"}
                    />
                  </div>
                  <p className="mt-2.5 text-[10px] leading-4 text-slate-400">
                    {t("session.claimQuality.coverageNote")}
                  </p>
                </section>

                <section className="pt-6" aria-labelledby="gcc-pipeline-heading">
                  <h3 id="gcc-pipeline-heading" className="border-b border-slate-200 pb-2 text-[14px] font-medium text-slate-500">{t("session.claimQuality.documentationPipeline")}</h3>
                  <div>
                    <PipelineRow label={t("session.claimQuality.transcriptStream")} state={transcript.state} detail={transcript.detail} tone={transcript.tone} />
                    <PipelineRow
                      label={t("session.claimQuality.soapSynthesis")}
                      state={sessionStatus === "stopping"
                        ? t("session.claimQuality.processing")
                        : sessionStatus === "stopped"
                          ? t("session.claimQuality.sessionComplete")
                          : t("session.claimQuality.pending")}
                      detail={sessionStatus === "stopped"
                        ? t("session.claimQuality.soapFlow")
                        : t("session.claimQuality.afterStop")}
                      tone={sessionStatus === "stopping" ? "amber" : sessionStatus === "stopped" ? "green" : "slate"}
                    />
                    <PipelineRow
                      label={t("session.claimQuality.clinicalNoteDraft")}
                      state={sessionStatus === "stopping"
                        ? t("session.claimQuality.queued")
                        : sessionStatus === "stopped"
                          ? t("session.claimQuality.soapWorkspace")
                          : t("session.claimQuality.pending")}
                      detail={t("session.claimQuality.afterStop")}
                      tone={sessionStatus === "stopped" ? "indigo" : "slate"}
                    />
                  </div>
                </section>

                <section className="pt-5" aria-labelledby="gcc-live-session-heading">
                  <h3 id="gcc-live-session-heading" className="border-b border-slate-200 pb-2 text-[14px] font-medium text-slate-500">{t("session.claimQuality.liveSession")}</h3>
                  <dl>
                    <div className="flex min-h-[58px] items-center justify-between gap-5 border-b border-slate-100 py-3">
                      <dt className="text-[13px] font-semibold text-slate-800">{t("session.claimQuality.ambientStatus")}</dt>
                      <dd className={`flex items-center gap-2 text-end text-[11px] font-medium ${toneClasses[ambientTone].text}`}>
                        <span className={`size-2 rounded-full ${toneClasses[ambientTone].dot}`} aria-hidden="true" />
                        {sessionStatusLabel(sessionStatus, t)}
                      </dd>
                    </div>
                    <div className="flex min-h-[58px] items-center justify-between gap-5 border-b border-slate-100 py-3">
                      <dt className="text-[13px] font-semibold text-slate-800">{t("session.claimQuality.voiceProvider")}</dt>
                      <dd className="text-end text-[11px] font-medium text-slate-500">{t("session.claimQuality.browserSpeech")}</dd>
                    </div>
                    <div className="flex min-h-[58px] items-center justify-between gap-5 py-3">
                      <dt className="text-[13px] font-semibold text-slate-800">{t("session.claimQuality.liveInsights")}</dt>
                      <dd className={`text-end text-[11px] font-medium ${insightStatus === "unavailable" ? "text-amber-600" : "text-indigo-600"}`}>
                        {insightStatusLabel(insightStatus, t)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="pt-5" aria-labelledby="gcc-health-heading">
                  <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-2">
                    <h3 id="gcc-health-heading" className="text-[14px] font-medium text-slate-500">{t("session.claimQuality.healthMetrics")}</h3>
                    {lastUpdatedAt && <span className="text-[9px] font-medium text-emerald-600">{t("session.claimQuality.updatedThisSession")}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <MetricCard label={t("session.claimQuality.metric.claimQuality")} value={qualityMetric} detail={qualityDetail} />
                    <MetricCard
                      label={t("session.claimQuality.metric.riskScore")}
                      value={t("session.claimQuality.metric.notScored")}
                      detail={t("session.claimQuality.metric.noRisk")}
                    />
                  </div>
                  {readiness && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <MetricCard label={t("session.claimQuality.metric.blockingItems")} value={formatNumber(readiness.blockingIssues)} />
                      <MetricCard label={t("session.claimQuality.metric.warnings")} value={formatNumber(readiness.warnings)} />
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="relative z-[70] shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="gcc-claim-quality-panel"
        className="grid h-[64px] w-[clamp(210px,25vw,300px)] grid-cols-[52px_minmax(0,1fr)_48px] items-center overflow-hidden rounded-[17px] border border-slate-200/90 bg-white text-start shadow-[0_10px_28px_rgba(48,61,115,0.09)] transition duration-200 hover:border-indigo-200 hover:shadow-[0_13px_34px_rgba(48,61,115,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:translate-y-px sm:h-[72px] sm:grid-cols-[56px_minmax(0,1fr)_56px]"
      >
        <span className="grid h-full place-items-center border-e border-slate-200 text-slate-600">
          <ChevronRight
            className={`size-[19px] transition-transform duration-200 ${direction === "rtl" ? (open ? "" : "rotate-180") : open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
        <span className="min-w-0 px-3">
          <span className="flex items-center gap-2">
            <span className={`size-2 shrink-0 rounded-full ${hasIssue ? "bg-amber-400" : readiness ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden="true" />
            <strong className="truncate text-[13px] font-medium text-slate-950 sm:text-[15px]">{t("session.claimQuality.title")}</strong>
          </span>
          <span className="mt-0.5 block truncate ps-4 text-[9px] font-medium text-slate-500 sm:text-[10px]">{compactLabel(readiness, insightStatus, t, formatNumber)}</span>
        </span>
        <span
          className={`relative grid size-10 place-self-center place-items-center rounded-full border-[4px] bg-white ${hasIssue ? "border-amber-400 border-e-amber-100" : readiness ? "border-indigo-600 border-e-indigo-100" : "border-slate-200 border-e-indigo-400"}`}
          title={t("session.claimQuality.scoreUnavailableTitle")}
          aria-label={scoreAriaLabel}
        >
          {indicatorContent}
        </span>
      </button>
      {expandedPanel}
    </div>
  );
}
