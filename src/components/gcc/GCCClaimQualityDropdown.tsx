"use client";

import { useEffect, useRef, useState } from "react";

type GCCClaimQualityDropdownProps = {
  compactScore: number;
};

const complianceStatuses = ["Pre-Auth", "NPHIES Ready", "Eligibility Verified", "Coding Audit (2)"];

const pipelineRows = [
  { label: "Transcript Stream", status: "Complete", percent: 100, tone: "text-emerald-600" },
  { label: "SOAP Synthesis", status: "Processing", percent: 72, tone: "text-indigo-600" },
  { label: "Clinical Note Draft", status: "Pending", percent: 58, tone: "text-amber-600" },
];

export default function GCCClaimQualityDropdown({ compactScore }: GCCClaimQualityDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        aria-haspopup="dialog"
        aria-controls="gcc-claim-quality-panel"
        className="flex h-10 w-[132px] items-center gap-1.5 rounded-[10px] border border-white/90 bg-white px-2 text-left shadow-[0_6px_16px_rgba(48,61,115,0.09)] transition hover:border-indigo-100 hover:shadow-md"
      >
        <span className="relative grid size-6 shrink-0 place-items-center rounded-md bg-indigo-50 text-indigo-600">
          <svg viewBox="0 0 24 24" className="size-3" aria-hidden="true">
            <path d="M7 3.5h7.5L18 7v13H7Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
            <path d="M14 3.5V7h4M10 11h5M10 14.5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
          <i className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full border border-white bg-emerald-500" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block whitespace-nowrap text-[8px] font-extrabold text-slate-700">Claim Quality</strong>
        </span>
        <span
          className="relative grid size-[30px] shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(#4f46e5 0 ${compactScore}%, #e9eaf7 ${compactScore}% 100%)` }}
        >
          <i className="absolute inset-[3px] rounded-full bg-white" />
          <b className="relative text-[8px] text-indigo-700">{compactScore}%</b>
        </span>
      </button>

      {open && (
        <div
          id="gcc-claim-quality-panel"
          role="dialog"
          aria-label="Claim Quality details"
          className="absolute right-0 top-[calc(100%+10px)] z-[80] max-h-[min(590px,calc(100vh-7rem))] w-[min(340px,calc(100vw-2rem))] overflow-y-auto rounded-[18px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_22px_65px_rgba(31,38,83,0.22)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative grid size-8 place-items-center rounded-[10px] bg-indigo-50 text-indigo-600">
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                  <path d="M7 3.5h7.5L18 7v13H7Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
                  <path d="M14 3.5V7h4M10 11h5M10 14.5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                </svg>
                <i className="absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-white bg-emerald-500" />
              </span>
              <div>
                <p className="text-[9px] font-semibold text-slate-400">Live claim analysis</p>
                <h2 className="text-xs font-extrabold text-slate-800">Claim Quality</h2>
              </div>
            </div>
            <span className="relative grid size-12 place-items-center rounded-full bg-[conic-gradient(#5952e8_0_98%,#ececf8_98%)]">
              <i className="absolute inset-[5px] rounded-full bg-white" />
              <b className="relative text-[11px] text-indigo-700">98%</b>
            </span>
          </div>

          <section className="border-b border-slate-100 py-3">
            <h3 className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-slate-500">Compliance &amp; RCM</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {complianceStatuses.map((status, index) => (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-bold ${
                    index === 3
                      ? "border-sky-100 bg-sky-50 text-sky-700"
                      : "border-emerald-100 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <i className={`size-1.5 rounded-full ${index === 3 ? "bg-sky-500" : "bg-emerald-500"}`} />
                  {status}
                </span>
              ))}
            </div>
          </section>

          <section className="border-b border-slate-100 py-3">
            <h3 className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-slate-500">Documentation Pipeline</h3>
            <div className="mt-1.5">
              {pipelineRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[1fr_auto_34px] items-center gap-2 border-b border-slate-100/80 py-2 last:border-0">
                  <span className="text-[9px] font-semibold text-slate-600">{row.label}</span>
                  <span className={`text-[8px] font-bold ${row.tone}`}>{row.status}</span>
                  <strong className="text-right text-[9px] text-slate-700">{row.percent}%</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="border-b border-slate-100 py-3">
            <h3 className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-slate-500">Live Session</h3>
            <div className="mt-1.5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] font-semibold text-slate-500">Ambient Status</span>
                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-600">
                  <i className="size-1.5 rounded-full bg-emerald-500" />
                  Active Listening
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] font-semibold text-slate-500">Voice Provider</span>
                <span className="text-right text-[9px] font-bold text-slate-700">Verified: Dr. Aziz</span>
              </div>
            </div>
          </section>

          <section className="pt-3">
            <h3 className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-slate-500">Session Health Metrics</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 p-2.5">
                <span className="block text-[8px] font-semibold text-slate-400">Claim Quality</span>
                <strong className="mt-1 block text-base text-indigo-700">98%</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5">
                <span className="block text-[8px] font-semibold text-slate-400">Risk Score</span>
                <strong className="mt-1 block text-base text-emerald-600">Low</strong>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
