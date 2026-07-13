"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GCCClaimQualityDropdown from "@/components/gcc/GCCClaimQualityDropdown";
import GCCHeader from "@/components/gcc/GCCHeader";
import GCCInsightsSheet from "@/components/gcc/GCCInsightsSheet";
import GCCSessionHero from "@/components/gcc/GCCSessionHero";
import { gccSession } from "@/lib/mock/gcc-session";

/* eslint-disable @next/next/no-img-element -- The prototype uses a static mocked patient avatar. */

export default function GCCSessionPage() {
  const router = useRouter();
  const [claimFocused, setClaimFocused] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(224,231,255,0.5),transparent_34%),#f3f6fb] text-slate-900">
      <GCCHeader />
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-2 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[260px_minmax(520px,640px)_220px] xl:gap-6">
          <section className="row-start-1 flex min-w-0 items-center gap-2 sm:col-start-1 xl:col-start-1">
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
          </section>

          <div className="col-start-1 row-start-3 w-full max-w-[640px] justify-self-center sm:col-span-2 sm:row-start-2 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:max-w-none">
            <div className="space-y-4">
              <GCCSessionHero timer={gccSession.recordingTime} transcript={[...gccSession.transcript]} onStopRecording={() => router.push("/soap-notes")} />
              <GCCInsightsSheet
                count={gccSession.suggestionsCount}
                suggestions={[...gccSession.suggestions]}
                claimFocused={claimFocused}
                onClaimFocus={() => setClaimFocused((value) => !value)}
              />
            </div>
          </div>

          <aside className="col-start-1 row-start-2 justify-self-end sm:col-start-2 sm:row-start-1 xl:col-start-3 xl:justify-self-end">
            <GCCClaimQualityDropdown compactScore={gccSession.claimQuality} />
          </aside>
        </div>
      </main>
    </div>
  );
}
