"use client";

import { useState } from "react";
import GCCTranscript from "@/components/gcc/GCCTranscript";
import type { TranscriptLine } from "@/lib/mock/gcc-session";

const bars = [12, 20, 15, 30, 21, 38, 19, 26, 44, 31, 17, 37, 26, 48, 32, 21, 40, 27, 16, 33, 22, 42, 29, 18, 35, 24, 14];

export default function GCCSessionHero({ timer, transcript }: { timer: string; transcript: TranscriptLine[] }) {
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/76 px-4 py-8 shadow-[0_18px_55px_rgba(48,61,115,0.09)] backdrop-blur-xl sm:px-8 sm:py-9">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#7f86df_0.7px,transparent_0.7px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      <div className="relative mx-auto flex max-w-xl items-center justify-center gap-5 sm:gap-12">
        <button
          type="button"
          onClick={() => {
            setPaused((value) => !value);
            setStopped(false);
          }}
          aria-label={paused ? "Resume recording" : "Pause recording"}
          className="grid size-12 place-items-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 sm:size-14"
        >
          {paused ? (
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path d="m9 7 8 5-8 5Z" fill="currentColor" /></svg>
          ) : (
            <span className="flex gap-1"><i className="h-4 w-[3px] rounded bg-current" /><i className="h-4 w-[3px] rounded bg-current" /></span>
          )}
        </button>

        <div className="relative grid size-32 place-items-center sm:size-40">
          <span className="absolute inset-0 rounded-full border border-indigo-200/70 animate-[ping_2.6s_ease-out_infinite]" />
          <span className="absolute inset-4 rounded-full border border-dashed border-indigo-200 bg-indigo-50/60" />
          <span className="absolute inset-8 rounded-full bg-indigo-100/70 blur-[1px]" />
          <div className={`relative grid size-16 place-items-center rounded-full text-white shadow-[0_15px_35px_rgba(78,70,229,0.36)] sm:size-20 ${stopped ? "bg-slate-400" : "bg-gradient-to-br from-[#7467ff] to-[#4539dc]"}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
              <rect x="8" y="3.5" width="8" height="12" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStopped(true)}
          aria-label="Stop recording"
          className="grid size-12 place-items-center rounded-full border border-rose-100 bg-white text-rose-500 shadow-lg shadow-rose-100 transition hover:-translate-y-0.5 sm:size-14"
        >
          <span className="size-4 rounded-[4px] bg-current" />
        </button>
      </div>

      <div className="relative mt-3 text-center">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400">
          {stopped ? "Recording stopped" : paused ? "Recording paused" : "Say “Stop Recording”"}
        </p>
        <div className="mx-auto mt-4 flex h-12 max-w-sm items-center justify-center gap-[4px]">
          {bars.map((height, index) => (
            <i
              key={`${height}-${index}`}
              className={`w-[3px] rounded-full bg-gradient-to-t from-indigo-400 to-sky-400 ${paused || stopped ? "opacity-35" : "gcc-wave-bar"}`}
              style={{ height, animationDelay: `${index * 45}ms` }}
            />
          ))}
        </div>
        <strong className="mt-2 block font-mono text-2xl tracking-[0.08em] text-slate-800">{timer}</strong>
        <GCCTranscript lines={transcript} />
      </div>
    </section>
  );
}
