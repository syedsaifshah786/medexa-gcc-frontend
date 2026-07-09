"use client";

import { useState } from "react";
import GCCClaimQualityDropdown from "@/components/gcc/GCCClaimQualityDropdown";
import GCCHeader from "@/components/gcc/GCCHeader";
import GCCInsightsSheet from "@/components/gcc/GCCInsightsSheet";
import GCCSessionHero from "@/components/gcc/GCCSessionHero";
import { gccSession } from "@/lib/mock/gcc-session";

/* eslint-disable @next/next/no-img-element -- The prototype uses a static mocked patient avatar. */

export default function GCCSessionPage() {
  const [claimFocused, setClaimFocused] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(224,231,255,0.5),transparent_34%),#f3f6fb] text-slate-900">
      <GCCHeader />
      <section className="relative z-40 flex w-full items-center justify-between gap-3 px-4 py-2 md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" aria-label="Go back" onClick={() => history.back()} className="grid size-7 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-indigo-600">
            <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
          </button>
          <img src={gccSession.patient.avatar} alt="" className="size-8 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1">
              <h1 className="truncate text-[11px] font-extrabold text-slate-900">{gccSession.patient.name}</h1>
              <span className="shrink-0 text-[8px] font-semibold text-slate-400">{gccSession.patient.demographics}</span>
              <span
                title={gccSession.patient.status}
                aria-label={gccSession.patient.status}
                className="grid size-3 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"
              >
                <svg viewBox="0 0 12 12" className="size-2" aria-hidden="true">
                  <path d="m3 6 2 2 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
              </span>
            </div>
            <p className="mt-0.5 text-[8px] font-medium text-slate-400">{gccSession.patient.sessionProgress}</p>
          </div>
        </div>

        <GCCClaimQualityDropdown compactScore={gccSession.claimQuality} />
      </section>

      <main className="mx-auto w-full max-w-[800px] px-4 pb-12 md:px-6">
        <div className="space-y-4">
          <GCCSessionHero timer={gccSession.recordingTime} transcript={[...gccSession.transcript]} />
          <GCCInsightsSheet
            count={gccSession.suggestionsCount}
            suggestions={[...gccSession.suggestions]}
            claimFocused={claimFocused}
            onClaimFocus={() => setClaimFocused((value) => !value)}
          />
        </div>
      </main>
    </div>
  );
}
