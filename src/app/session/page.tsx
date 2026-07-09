"use client";

import { useState } from "react";
import GCCHeader from "@/components/gcc/GCCHeader";
import GCCInsightsSheet from "@/components/gcc/GCCInsightsSheet";
import GCCSessionHero from "@/components/gcc/GCCSessionHero";
import GCCTranscript from "@/components/gcc/GCCTranscript";
import { gccSession } from "@/lib/mock/gcc-session";

export default function GCCSessionPage() {
  const [expanded, setExpanded] = useState(false);
  const [claimFocused, setClaimFocused] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f6fb] text-slate-900">
      <GCCHeader />
      <main className="mx-auto w-full max-w-[1060px] px-4 pb-14 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <section className="mb-5 flex flex-col gap-4 rounded-[22px] border border-white/90 bg-white/70 p-3 shadow-[0_12px_38px_rgba(48,61,115,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Go back" onClick={() => history.back()} className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:text-indigo-600">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
            </button>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-200 to-indigo-300 text-xs font-extrabold text-indigo-800 ring-4 ring-white">
              {gccSession.patient.initials}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">{gccSession.patient.name}</h1>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600">
                  ✓ {gccSession.patient.status}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-400">
                <span>{gccSession.patient.demographics}</span>
                <i className="size-1 rounded-full bg-slate-300" />
                <span>{gccSession.patient.sessionProgress}</span>
                <i className="size-1 rounded-full bg-slate-300" />
                <span className="text-indigo-500">GCC Session</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setClaimFocused((value) => !value)}
            className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-white px-4 py-2.5 text-left shadow-sm sm:min-w-48"
          >
            <span>
              <small className="block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Claim Quality</small>
              <strong className="mt-0.5 block text-xs text-slate-700">Good documentation</strong>
            </span>
            <span className="relative grid size-12 place-items-center rounded-full bg-[conic-gradient(#4f46e5_0_86%,#e9eaf7_86%)]">
              <i className="absolute inset-[5px] rounded-full bg-white" />
              <b className="relative text-xs text-indigo-700">{gccSession.claimQuality}%</b>
            </span>
          </button>
        </section>

        <div className="space-y-5">
          <GCCSessionHero timer={gccSession.recordingTime} />
          <GCCTranscript lines={[...gccSession.transcript]} />
          <GCCInsightsSheet
            count={gccSession.suggestionsCount}
            suggestions={[...gccSession.suggestions]}
            expanded={expanded}
            claimFocused={claimFocused}
            onToggleExpanded={() => setExpanded((value) => !value)}
            onClaimFocus={() => setClaimFocused((value) => !value)}
          />
        </div>
      </main>
    </div>
  );
}
