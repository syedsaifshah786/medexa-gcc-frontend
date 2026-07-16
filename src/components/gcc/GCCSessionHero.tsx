"use client";

import { Mic, Pause, Play, Square, Timer } from "lucide-react";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { SessionStatus } from "@/providers/GCCVoiceSessionProvider";

const waveformBars = [
  12, 15, 13, 17, 14, 18, 16, 29, 18, 25, 20, 34, 24, 36, 21, 29, 39, 27, 45, 30, 37, 26, 48, 32, 42, 27, 36, 24, 40, 26,
  34, 21, 29, 19, 31, 20, 27, 17, 23, 16, 20, 14, 17, 13, 15,
];

type GCCSessionHeroProps = {
  timer: string;
  status: SessionStatus;
  isManualDemo?: boolean;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void | Promise<void>;
};

function SessionMessage({ status, isManualDemo }: { status: SessionStatus; isManualDemo: boolean }) {
  const { t } = useGCCLocale();

  switch (status) {
    case "recording":
      if (isManualDemo) return <>{t("session.hero.manualRecording")}</>;
      return (
        <>
          {t("session.hero.sayPrefix")}{" "}
          <strong className="font-bold text-[#071ed2]">
            {t("session.hero.commandQuote", {
              command: t("session.hero.stopRecordingCommand"),
            })}
          </strong>
        </>
      );
    case "paused":
      return <>{t("session.hero.pausedMessage")}</>;
    case "stopping":
      return <>{t("session.hero.generatingReview")}</>;
    case "starting":
      return <>{t("session.hero.startingListening")}</>;
    case "stopped":
      return <>{t("session.hero.sessionStopped")}</>;
    case "error":
      return <>{t("session.hero.unavailable")}</>;
    default:
      return <>{t(isManualDemo ? "session.hero.manualRecording" : "session.hero.startPrompt")}</>;
  }
}

export default function GCCSessionHero({
  timer,
  status,
  isManualDemo = false,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
}: GCCSessionHeroProps) {
  const { t } = useGCCLocale();
  const isRecording = status === "recording" || (isManualDemo && status === "idle");
  const isPaused = status === "paused";
  const isStarting = status === "starting";
  const isFinalizing = status === "stopping";
  const canControlRecording = isRecording || isPaused;
  const primaryLabel = isPaused
    ? t("session.hero.resume")
    : isRecording
      ? t("session.hero.pause")
      : t("session.hero.start");

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
    <section aria-label={t("session.hero.controls")} className="relative mx-auto w-full max-w-[760px] px-3 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 size-[280px] -translate-x-1/2 rounded-full opacity-65 [background-image:radial-gradient(circle,rgba(99,102,241,0.3)_1px,transparent_1.4px)] [background-size:10px_10px] [mask-image:radial-gradient(circle,black_0%,rgba(0,0,0,.72)_45%,transparent_76%)] sm:size-[320px]"
      />

      <div className="relative flex flex-col items-center">
        <div dir="ltr" className="grid grid-cols-[52px_118px_52px] items-center justify-center gap-7 sm:grid-cols-[56px_132px_56px] sm:gap-9">
          <button
            type="button"
            onClick={isPaused ? onResumeRecording : onPauseRecording}
            disabled={!canControlRecording || isFinalizing}
            aria-label={isPaused ? t("session.hero.resume") : t("session.hero.pause")}
            title={isPaused ? t("session.hero.resume") : t("session.hero.pause")}
            className="grid size-[48px] place-items-center justify-self-center rounded-full border-2 border-slate-200 bg-white text-[#071ed2] shadow-[0_5px_15px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_8px_20px_rgba(30,64,175,0.12)] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200/70 sm:size-[50px]"
          >
            {isPaused ? <Play aria-hidden="true" size={19} fill="currentColor" strokeWidth={2.25} /> : <Pause aria-hidden="true" size={20} fill="currentColor" strokeWidth={2.25} />}
          </button>

          <div className="relative grid size-[118px] place-items-center sm:size-[132px]">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-indigo-200/75 bg-white/30" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-[13px] rounded-full border border-[#7c8af7]/50 bg-white/70 shadow-[0_0_28px_rgba(99,102,241,0.18)] sm:inset-[15px]" />
            {isRecording && (
              <span className="pointer-events-none absolute inset-[4px] rounded-full border border-indigo-300/55 animate-[ping_2.5s_ease-out_infinite] motion-reduce:animate-none" />
            )}
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={isStarting || isFinalizing}
              aria-label={primaryLabel}
              title={primaryLabel}
              className="relative grid size-[78px] place-items-center rounded-full border-[3px] border-white/90 bg-[radial-gradient(circle_at_48%_38%,#4e568c_0%,#222a57_43%,#101938_72%,#101a2f_100%)] text-white shadow-[inset_0_0_0_2px_rgba(129,140,248,0.5),inset_0_-14px_24px_rgba(52,211,153,0.16),0_8px_22px_rgba(30,41,91,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_2px_rgba(129,140,248,0.62),inset_0_-14px_24px_rgba(52,211,153,0.2),0_12px_28px_rgba(30,41,91,0.34)] active:translate-y-0 active:scale-95 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300/75 focus-visible:ring-offset-4 sm:size-[88px]"
            >
              <Mic aria-hidden="true" size={35} strokeWidth={1.85} className="drop-shadow-sm sm:size-10" />
              <span aria-hidden="true" className="absolute bottom-[13px] h-px w-8 rounded-full bg-emerald-200/75 shadow-[0_0_7px_rgba(167,243,208,.8)]" />
            </button>
          </div>

          <button
            type="button"
            onClick={onStopRecording}
            disabled={!canControlRecording || isFinalizing}
            aria-label={t("session.hero.stopFinalize")}
            title={t("session.hero.stopFinalize")}
            className="grid size-[48px] place-items-center justify-self-center rounded-full border border-[#1026d8] bg-[#071ed2] text-white shadow-[0_8px_20px_rgba(7,30,210,0.2)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0015bd] hover:shadow-[0_11px_24px_rgba(7,30,210,0.28)] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200/80 sm:size-[50px]"
          >
            <Square aria-hidden="true" size={20} strokeWidth={2.25} />
          </button>
        </div>

        <p aria-live="polite" className="mt-3 min-h-7 text-center text-[15px] font-normal leading-7 text-slate-500 sm:mt-4 sm:text-[16px]">
          <SessionMessage status={status} isManualDemo={isManualDemo} />
        </p>

        <div dir="ltr" className="mt-2 flex w-full max-w-[570px] items-center justify-center gap-4 sm:mt-3 sm:gap-5">
          <div aria-hidden="true" className="flex h-[54px] min-w-0 flex-1 items-center justify-center gap-[3px] overflow-hidden sm:gap-1">
            {waveformBars.map((height, index) => (
              <i
                key={`${height}-${index}`}
                className={`w-[3px] shrink-0 rounded-full bg-[#071ed2] transition-[height,opacity] duration-300 ${
                  isRecording ? "gcc-wave-bar opacity-100" : isPaused ? "opacity-35" : "opacity-20"
                }`}
                style={{ height, animationDelay: `${index * 34}ms` }}
              />
            ))}
          </div>

          <time aria-live="off" className="inline-flex shrink-0 items-center gap-2 text-[18px] font-semibold tabular-nums text-[#071ed2] sm:text-[21px]">
            <Timer aria-hidden="true" size={24} strokeWidth={1.9} />
            <span className="sr-only">{t("session.hero.elapsedTime")} </span>
            {timer}
          </time>
        </div>
      </div>
    </section>
  );
}
