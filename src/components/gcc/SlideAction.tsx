"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useGCCLocale } from "@/hooks/useGCCLocale";

type SlideActionProps = {
  label: string;
  completedLabel: string;
  onComplete: () => void;
  variant?: "light" | "dark";
  className?: string;
  completed?: boolean;
  disabled?: boolean;
};

const threshold = 0.8;

export default function SlideAction({
  label,
  completedLabel,
  onComplete,
  variant = "light",
  className = "",
  completed: controlledCompleted,
  disabled = false,
}: SlideActionProps) {
  const { t, formatNumber } = useGCCLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startProgressRef = useRef(0);
  const progressRef = useRef(0);
  const previousUserSelectRef = useRef("");
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [internalCompleted, setInternalCompleted] = useState(false);
  const [travelDistance, setTravelDistance] = useState(0);
  const completed = controlledCompleted ?? internalCompleted;
  const displayedProgress = completed ? 1 : progress;

  const measureTravelDistance = () => {
    if (!trackRef.current || !knobRef.current) return 0;
    return trackRef.current.clientWidth - knobRef.current.offsetWidth - 8;
  };

  const updateProgress = (nextProgress: number) => {
    const clampedProgress = Math.min(1, Math.max(0, nextProgress));
    progressRef.current = clampedProgress;
    setProgress(clampedProgress);
  };

  const restoreTextSelection = () => {
    document.body.style.userSelect = previousUserSelectRef.current;
  };

  const finish = () => {
    if (completed || disabled) return;
    updateProgress(1);
    if (controlledCompleted === undefined) {
      setInternalCompleted(true);
    }
    onComplete();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (completed || disabled || (event.pointerType === "mouse" && event.button !== 0)) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    startXRef.current = event.clientX;
    startProgressRef.current = progressRef.current;
    previousUserSelectRef.current = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || completed) return;

    event.preventDefault();
    event.stopPropagation();
    const currentTravelDistance = measureTravelDistance();
    if (currentTravelDistance <= 0) return;

    updateProgress(
      startProgressRef.current +
        (event.clientX - startXRef.current) /
          currentTravelDistance,
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || completed) return;

    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    restoreTextSelection();

    if (progressRef.current > threshold) {
      updateProgress(1);
      finish();
    } else {
      updateProgress(0);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || completed) return;

    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    restoreTextSelection();
    updateProgress(0);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (completed || disabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      finish();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      updateProgress(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      finish();
      return;
    }

    if (["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const isForward =
        event.key === "ArrowUp" ||
        event.key === "ArrowRight";
      const nextProgress = progressRef.current + (isForward ? 1 : -1) * 0.1;
      if (nextProgress > threshold) {
        finish();
      } else {
        updateProgress(nextProgress);
      }
    }
  };

  useEffect(
    () => () => {
      if (isDragging) restoreTextSelection();
    },
    [isDragging],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateTravelDistance = () => setTravelDistance(Math.max(0, measureTravelDistance()));
    updateTravelDistance();

    const resizeObserver = new ResizeObserver(updateTravelDistance);
    resizeObserver.observe(track);
    return () => resizeObserver.disconnect();
  }, []);

  const isDark = variant === "dark";

  return (
    <div
      ref={trackRef}
      dir="ltr"
      role="slider"
      tabIndex={completed || disabled ? -1 : 0}
      aria-label={t("session.slider.dragToConfirm", { label })}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(displayedProgress * 100)}
      aria-valuetext={
        completed
          ? completedLabel
          : t("session.slider.percent", {
              percent: formatNumber(Math.round(displayedProgress * 100)),
            })
      }
      aria-orientation="horizontal"
      aria-disabled={completed || disabled}
      data-slide-action
      onKeyDown={handleKeyDown}
      onClick={(event) => event.stopPropagation()}
      className={`relative h-[52px] select-none overflow-hidden rounded-full border shadow-[0_5px_16px_rgba(55,65,130,0.10)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 ${
        isDark
          ? "border-indigo-200/70 bg-white/80 text-slate-900"
          : "border-indigo-300/80 bg-white/75 text-slate-900 backdrop-blur-sm"
      } ${completed ? "border-emerald-400/30 bg-emerald-500 text-white" : ""} ${disabled ? "cursor-not-allowed opacity-55" : ""} ${className}`}
      style={{ touchAction: "none" }}
    >
      {!completed && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 start-0 transition-opacity ${isDark ? "bg-indigo-200/55" : "bg-indigo-100/80"}`}
          style={{ width: `${displayedProgress * 100}%` }}
        />
      )}

      <span className="pointer-events-none absolute inset-0 grid place-items-center px-14 text-[14px] font-medium sm:text-[16px]">
        {completed ? completedLabel : label}
      </span>

      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`absolute start-1 top-1 grid size-11 place-items-center rounded-full border shadow-[0_3px_10px_rgba(40,53,120,0.18)] ${
          completed ? "cursor-default border-white bg-white text-emerald-600" : "cursor-grab border-indigo-100 bg-white text-[#001bd1] active:cursor-grabbing"
        } ${disabled ? "cursor-not-allowed" : ""} ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
        style={{
          transform: `translateX(${displayedProgress * Math.max(0, travelDistance)}px)`,
          touchAction: "none",
        }}
      >
        {completed ? (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path d="m7.5 12 3 3 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            aria-hidden="true"
          >
            <path d="M6.5 12h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        )}
      </div>
    </div>
  );
}
