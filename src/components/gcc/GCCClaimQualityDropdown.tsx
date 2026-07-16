"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, ChevronLeft, PanelRightClose, X } from "lucide-react";

function QualityRing({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`${compact ? "size-12" : "size-[52px]"} grid shrink-0 place-items-center rounded-full p-[4px]`}
      style={{ background: "conic-gradient(#3b43d8 0deg 352.8deg, #e8e9ff 352.8deg 360deg)" }}
      aria-label="Claim quality 98 percent"
    >
      <span className="grid size-full place-items-center rounded-full bg-white text-[15px] font-medium text-[#23242a]">
        98%
      </span>
    </span>
  );
}

function CompliancePill({ children, verified = false }: { children: ReactNode; verified?: boolean }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[#e2e3e8] bg-white px-3 text-[13px] font-medium text-[#33343a]">
      <i className="size-2 rounded-full bg-[#20c66b]" aria-hidden="true" />
      {children}
      {verified && <BadgeCheck className="size-[19px] text-[#7eaa00]" strokeWidth={2.2} aria-hidden="true" />}
    </span>
  );
}

function PipelineRow({
  label,
  status,
  progress,
}: {
  label: string;
  status: string;
  progress: number;
}) {
  const active = progress < 100;
  return (
    <div className="relative grid min-h-[58px] grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#eff0f3] py-3 last:border-b-0">
      <p className="text-[13px] font-medium text-[#24252a]">{label}</p>
      <span className={`text-[12px] ${active ? "text-[#77777e]" : "text-[#6f7076]"}`}>{status}</span>
      <span className="min-w-12 border-s border-[#e1e2e6] ps-3 text-end text-[12px] font-medium text-[#292a30]">{progress}%</span>
      <span className="absolute inset-x-0 bottom-0 h-px overflow-hidden bg-transparent" aria-hidden="true">
        <i className="block h-full bg-gradient-to-r from-[#4754e8] to-[#62dc83] transition-[width] duration-700" style={{ width: `${progress}%` }} />
      </span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[74px] rounded-[16px] bg-[#f1f3f1] px-4 py-3.5">
      <p className="text-[9px] font-medium text-[#64666c]">{label}</p>
      <p className="mt-1 text-[19px] font-medium leading-none text-[#27282d]">{value}</p>
    </div>
  );
}

const subscribeToBrowser = () => () => undefined;

export default function GCCClaimQualityDropdown() {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeToBrowser, () => true, () => false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  const drawer = mounted
    ? createPortal(
        <div
          className={`fixed inset-0 z-[200] transition-[visibility] duration-300 ${open ? "visible" : "invisible delay-300"}`}
          aria-hidden={!open}
        >
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            aria-label="Close Claim Quality drawer"
            onClick={() => setOpen(false)}
            className={`absolute inset-0 size-full bg-white/60 backdrop-blur-[6px] transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
          />

          <aside
            id="gcc-claim-quality-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gcc-claim-quality-title"
            className={`absolute bottom-3 right-3 top-[76px] w-[min(478px,calc(100vw-24px))] overflow-hidden rounded-[20px] border border-[#dcdee5] bg-white shadow-[0_28px_90px_rgba(32,38,73,0.18)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.75,.2,1)] sm:bottom-6 sm:right-6 sm:top-[98px] ${open ? "translate-x-0 opacity-100" : "translate-x-[calc(100%+32px)] opacity-0"}`}
          >
            <div className="flex h-full min-h-0 flex-col">
              <header className="flex min-h-[82px] shrink-0 items-center gap-4 border-b border-[#eff0f3] px-6">
                <button
                  ref={closeRef}
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={() => setOpen(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#dadee8] text-[#505572] transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-[#071bc7] active:scale-95"
                  aria-label="Close Claim Quality drawer"
                >
                  <PanelRightClose className="size-5" aria-hidden="true" />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <i className="size-2 rounded-full bg-[#20c66b]" aria-hidden="true" />
                  <h2 id="gcc-claim-quality-title" className="text-[16px] font-medium text-[#1f2025]">Claim Quality</h2>
                </div>
                <QualityRing compact />
              </header>

              <div className="gcc-insights-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-5">
                <section aria-labelledby="compliance-title">
                  <h3 id="compliance-title" className="border-b border-[#dedfe4] pb-2 text-[14px] font-normal text-[#75767b]">Compliance &amp; RCM</h3>
                  <div className="flex flex-wrap gap-2 pt-4">
                    <CompliancePill verified>Pre-Auth</CompliancePill>
                    <CompliancePill>NPHIES Ready</CompliancePill>
                    <CompliancePill>Eligibility Verified</CompliancePill>
                    <CompliancePill>Coding Audit (2)</CompliancePill>
                  </div>
                </section>

                <section className="pt-7" aria-labelledby="pipeline-title">
                  <h3 id="pipeline-title" className="border-b border-[#dedfe4] pb-2 text-[14px] font-normal text-[#75767b]">Documentation Pipeline</h3>
                  <PipelineRow label="Transcript Stream" status="Complete" progress={100} />
                  <PipelineRow label="SOAP Synthesis" status="Processing" progress={72} />
                  <PipelineRow label="Clinical Note Draft" status="Pending" progress={58} />
                </section>

                <section className="pt-6" aria-labelledby="live-session-title">
                  <h3 id="live-session-title" className="border-b border-[#dedfe4] pb-2 text-[14px] font-normal text-[#75767b]">Live Session</h3>
                  <dl>
                    <div className="flex min-h-[58px] items-center justify-between gap-5 border-b border-[#eff0f3] py-3">
                      <dt className="text-[13px] font-medium text-[#24252a]">Ambient Status</dt>
                      <dd className="inline-flex items-center gap-2 text-[11px] font-medium text-[#42aa54]">
                        <i className="size-2 rounded-full bg-[#42b556]" aria-hidden="true" />
                        Active Listening
                      </dd>
                    </div>
                    <div className="flex min-h-[58px] items-center justify-between gap-5 py-3">
                      <dt className="text-[13px] font-medium text-[#24252a]">Voice Provider</dt>
                      <dd className="text-[11px] font-medium text-[#77777e]">Verified (Dr. Aris)</dd>
                    </div>
                  </dl>
                </section>

                <section className="pt-5" aria-labelledby="metrics-title">
                  <h3 id="metrics-title" className="border-b border-[#dedfe4] pb-2 text-[14px] font-normal text-[#75767b]">Session Health Metrics</h3>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <MetricCard label="Claim Quality" value="98%" />
                    <MetricCard label="Risk Score" value="Low" />
                  </div>
                </section>
              </div>
            </div>
          </aside>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="relative z-[70] shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="gcc-claim-quality-panel"
        className="grid h-[64px] w-[clamp(210px,25vw,300px)] grid-cols-[56px_minmax(0,1fr)_60px] items-center overflow-hidden rounded-[17px] border border-[#dfe1e8] bg-white text-start shadow-[0_10px_28px_rgba(48,61,115,0.09)] transition duration-200 hover:border-indigo-200 hover:shadow-[0_13px_34px_rgba(48,61,115,0.13)] active:translate-y-px sm:h-[72px]"
      >
        <span className="grid h-full place-items-center border-e border-[#dfe1e8] text-[#505572]">
          {open ? <X className="size-5" aria-hidden="true" /> : <ChevronLeft className="size-5" aria-hidden="true" />}
        </span>
        <span className="flex min-w-0 items-center gap-2 px-3">
          <i className="size-2 shrink-0 rounded-full bg-[#20c66b]" aria-hidden="true" />
          <strong className="truncate text-[13px] font-medium text-[#202126] sm:text-[15px]">Claim Quality</strong>
        </span>
        <QualityRing compact />
      </button>
      {drawer}
    </div>
  );
}
