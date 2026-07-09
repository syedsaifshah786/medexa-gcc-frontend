"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type SlideActionProps = {
  label: string;
  completedLabel: string;
  onComplete: () => void;
  variant?: "light" | "dark";
  className?: string;
};

const threshold = 0.82;

export default function SlideAction({
  label,
  completedLabel,
  onComplete,
  variant = "light",
  className = "",
}: SlideActionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startProgressRef = useRef(0);
  const progressRef = useRef(0);
  const previousUserSelectRef = useRef("");
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [travelDistance, setTravelDistance] = useState(0);

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

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (completed || (event.pointerType === "mouse" && event.button !== 0)) return;

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

    updateProgress(startProgressRef.current + (event.clientX - startXRef.current) / currentTravelDistance);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || completed) return;

    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    restoreTextSelection();

    if (progressRef.current >= threshold) {
      updateProgress(1);
      setCompleted(true);
      onComplete();
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
      role="slider"
      aria-label={`${label}. Drag to confirm.`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-valuetext={completed ? completedLabel : `${Math.round(progress * 100)} percent`}
      aria-disabled={completed}
      data-slide-action
      onClick={(event) => event.stopPropagation()}
      className={`relative h-10 select-none overflow-hidden rounded-full border shadow-[0_6px_16px_rgba(55,65,130,0.12)] ${
        isDark
          ? "border-white/10 bg-white/10 text-white"
          : "border-slate-200/80 bg-slate-100 text-slate-500"
      } ${completed ? "border-emerald-400/30 bg-emerald-500 text-white" : ""} ${className}`}
      style={{ touchAction: "none" }}
    >
      {!completed && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 transition-opacity ${isDark ? "bg-indigo-500/25" : "bg-indigo-100"}`}
          style={{ width: `${progress * 100}%` }}
        />
      )}

      <span className="pointer-events-none absolute inset-0 grid place-items-center px-11 text-[10px] font-bold">
        {completed ? completedLabel : label}
      </span>

      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`absolute left-1 top-1 grid size-8 place-items-center rounded-full shadow-md ${
          completed ? "cursor-default bg-white text-emerald-600" : "cursor-grab bg-gradient-to-br from-indigo-500 to-violet-500 text-white active:cursor-grabbing"
        } ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
        style={{ transform: `translateX(${progress * Math.max(0, travelDistance)}px)`, touchAction: "none" }}
      >
        {completed ? (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path d="m7.5 12 3 3 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path d="M6.5 12h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        )}
      </div>
    </div>
  );
}
