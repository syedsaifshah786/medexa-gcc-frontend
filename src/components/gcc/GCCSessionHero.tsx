"use client";

import { useState } from "react";
import GCCTranscript from "@/components/gcc/GCCTranscript";
import type { TranscriptLine } from "@/lib/mock/gcc-session";

const bars = [7, 13, 10, 21, 14, 27, 12, 18, 31, 21, 10, 25, 17, 33, 22, 14, 28, 18, 10, 23, 15, 30, 20, 11, 25, 17, 8];

export default function GCCSessionHero({ timer, transcript }: { timer: string; transcript: TranscriptLine[] }) {
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);

  return (
    <section className="relative w-full px-1 pb-0.5 pt-1">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center">
        <div className="relative h-32 w-[280px] max-w-full">
          <button
            type="button"
            onClick={() => {
              setPaused((value) => !value);
              setStopped(false);
            }}
            aria-label={paused ? "Resume recording" : "Pause recording"}
            className="absolute left-6 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-[0_5px_14px_rgba(79,70,229,0.13)] transition hover:scale-105"
          >
            {paused ? (
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path d="m9 7 8 5-8 5Z" fill="currentColor" /></svg>
            ) : (
              <span className="flex gap-1"><i className="h-3 w-0.5 rounded bg-current" /><i className="h-3 w-0.5 rounded bg-current" /></span>
            )}
          </button>

          <div className="absolute left-1/2 top-1/2 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center">
            <span className="absolute inset-0 rounded-full border border-indigo-200/60 animate-[ping_2.6s_ease-out_infinite]" />
            <span className="absolute inset-3 rounded-full border border-dashed border-indigo-200/90 bg-indigo-50/45" />
            <span className="absolute inset-6 rounded-full bg-indigo-100/55 blur-[1px]" />
            <div className={`relative grid size-14 place-items-center rounded-full text-white shadow-[0_10px_25px_rgba(78,70,229,0.34)] ${stopped ? "bg-slate-400" : "bg-gradient-to-br from-[#7467ff] to-[#4539dc]"}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <rect x="8" y="3.5" width="8" height="12" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              </svg>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStopped(true)}
            aria-label="Stop recording"
            className="absolute right-6 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-[0_5px_14px_rgba(79,70,229,0.13)] transition hover:scale-105"
          >
            <span className="size-2.5 rounded-[3px] bg-current" />
          </button>
        </div>

        <p className="text-[10px] font-semibold tracking-wide text-slate-400">
          {stopped ? (
            "Recording stopped"
          ) : paused ? (
            "Recording paused"
          ) : (
            <>Say <span className="text-indigo-600">Stop Recording</span>..</>
          )}
        </p>
        <div className="relative mt-1.5 h-10 w-full max-w-[380px]">
          <div className="absolute left-1/2 top-1/2 flex h-9 w-[calc(100%-96px)] max-w-[280px] -translate-x-1/2 -translate-y-1/2 items-center justify-between">
            {bars.map((height, index) => (
              <i
                key={`${height}-${index}`}
                className={`w-0.5 rounded-full bg-gradient-to-t from-indigo-500 to-sky-400 ${paused || stopped ? "opacity-35" : "gcc-wave-bar"}`}
                style={{ height, animationDelay: `${index * 45}ms` }}
              />
            ))}
          </div>
          <span className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 font-mono text-[10px] font-bold text-slate-600">
            <svg viewBox="0 0 24 24" className="size-3 text-indigo-500" aria-hidden="true">
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
            {timer}
          </span>
        </div>
        <GCCTranscript lines={transcript} />
      </div>
    </section>
  );
}
