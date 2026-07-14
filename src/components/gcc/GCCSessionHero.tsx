import { Mic, Pause, Play, Square } from "lucide-react";
import type { SessionStatus } from "@/providers/GCCVoiceSessionProvider";

const waveformBars = [
  14, 20, 12, 28, 18, 34, 16, 25, 38, 22, 15, 32, 19, 40, 26, 17, 35, 21, 13, 29, 18, 37, 24, 14, 31, 20, 12, 27, 17,
  33, 22, 15, 30, 19, 13,
];

type GCCSessionHeroProps = {
  timer: string;
  status: SessionStatus;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void | Promise<void>;
};

function getSessionMessage(status: SessionStatus) {
  switch (status) {
    case "recording":
      return "Listening to the session...";
    case "paused":
      return "Session paused \u2014 say \u201cResume session\u201d or press Resume";
    case "stopping":
      return "Generating the clinical review...";
    case "starting":
      return "Starting live listening...";
    case "stopped":
      return "Session stopped";
    case "error":
      return "Recording is unavailable. Check microphone access and try again.";
    default:
      return "Press the microphone to start the session";
  }
}

export default function GCCSessionHero({
  timer,
  status,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
}: GCCSessionHeroProps) {
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isStarting = status === "starting";
  const isFinalizing = status === "stopping";
  const canControlRecording = isRecording || isPaused;
  const primaryLabel = isPaused ? "Resume session" : isRecording ? "Pause session" : "Start session";

  const handlePrimaryAction = () => {
    if (isPaused) {
      onResumeRecording();
      return;
    }

    if (isRecording) {
      onPauseRecording();
      return;
    }

    onStartRecording();
  };

  return (
    <section
      aria-label="Recording controls"
      className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-[24px] border border-white/80 bg-[radial-gradient(circle_at_50%_18%,rgba(129,140,248,0.24),transparent_50%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(238,242,255,0.9))] px-4 py-[18px] shadow-[0_18px_50px_rgba(79,70,229,0.12)] sm:px-6"
    >
      <div className="pointer-events-none absolute -left-20 top-1/2 size-44 -translate-y-1/2 rounded-full bg-sky-300/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/2 size-44 -translate-y-1/2 rounded-full bg-violet-400/15 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <div className="flex items-center justify-center gap-5 sm:gap-8">
          <button
            type="button"
            onClick={isPaused ? onResumeRecording : onPauseRecording}
            disabled={!canControlRecording || isFinalizing}
            aria-label={isPaused ? "Resume session" : "Pause session"}
            title={isPaused ? "Resume session" : "Pause session"}
            className="grid size-[46px] shrink-0 place-items-center rounded-full border border-indigo-200 bg-white/90 text-indigo-700 shadow-[0_8px_22px_rgba(79,70,229,0.13)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200/70"
          >
            {isPaused ? <Play aria-hidden="true" size={20} fill="currentColor" /> : <Pause aria-hidden="true" size={20} fill="currentColor" />}
          </button>

          <div className="relative grid size-[72px] place-items-center max-sm:size-16">
            {isRecording && (
              <>
                <span className="pointer-events-none absolute -inset-3 rounded-full border border-indigo-300/45 animate-[ping_2.4s_ease-out_infinite] motion-reduce:animate-none" />
                <span className="pointer-events-none absolute -inset-1.5 rounded-full bg-indigo-400/15" />
              </>
            )}
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={isStarting || isFinalizing}
              aria-label={primaryLabel}
              title={primaryLabel}
              className="relative grid size-[72px] place-items-center rounded-full bg-gradient-to-br from-[#7768ff] via-[#6254ee] to-[#4338ca] text-white shadow-[0_14px_34px_rgba(79,70,229,0.4)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(79,70,229,0.46)] active:translate-y-0 active:scale-95 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 max-sm:size-16 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300/75 focus-visible:ring-offset-4"
            >
              <Mic aria-hidden="true" size={30} strokeWidth={2.1} className="max-sm:size-7" />
            </button>
          </div>

          <button
            type="button"
            onClick={onStopRecording}
            disabled={!canControlRecording || isFinalizing}
            aria-label="Stop and finalize session"
            title="Stop and finalize session"
            className="grid size-[46px] shrink-0 place-items-center rounded-full border border-rose-200 bg-rose-50/95 text-rose-600 shadow-[0_8px_22px_rgba(225,29,72,0.1)] transition duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200/75"
          >
            <Square aria-hidden="true" size={20} fill="currentColor" strokeWidth={1.8} />
          </button>
        </div>

        <p aria-live="polite" className="mt-3 min-h-5 text-center text-[13px] font-semibold leading-5 text-slate-600">
          {getSessionMessage(status)}
        </p>

        <div className="mt-2 flex w-full max-w-[660px] flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <div
            aria-hidden="true"
            className={`flex h-11 min-w-0 flex-1 items-center justify-between gap-1 rounded-full border px-3 sm:px-4 ${
              isRecording ? "border-indigo-100 bg-white/70" : "border-slate-200/70 bg-white/45"
            }`}
          >
            {waveformBars.map((height, index) => (
              <i
                key={`${height}-${index}`}
                className={`w-0.5 shrink-0 rounded-full bg-gradient-to-t from-indigo-600 to-sky-400 transition-opacity duration-300 sm:w-[3px] ${
                  isRecording ? "gcc-wave-bar opacity-100" : isPaused ? "opacity-35" : "opacity-20"
                }`}
                style={{ height, animationDelay: `${index * 38}ms` }}
              />
            ))}
          </div>

          <time
            aria-live="off"
            className="inline-flex h-9 min-w-[84px] shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 px-3 font-mono text-[13px] font-bold tabular-nums text-slate-700 shadow-sm"
          >
            <span className="sr-only">Elapsed session time </span>
            {timer}
          </time>
        </div>
      </div>
    </section>
  );
}
