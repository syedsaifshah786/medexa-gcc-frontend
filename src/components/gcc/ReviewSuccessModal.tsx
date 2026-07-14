"use client";

import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { useGCCLocale } from "@/hooks/useGCCLocale";

type ReviewSuccessModalProps = {
  sessionId: string | null;
  onClose: () => void;
  onBackHome: () => void;
  onSeeDoc: () => void;
};

export default function ReviewSuccessModal({ sessionId, onClose, onBackHome, onSeeDoc }: ReviewSuccessModalProps) {
  const { direction, formatNumber, t } = useGCCLocale();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useMemo(() => `review-success-${sessionId ?? "complete"}`, [sessionId]);
  const descriptionId = `${titleId}-description`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus();
    };
  }, [onClose]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements(modalRef.current);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#050816]/45 px-4 py-6 backdrop-blur-[5px]" role="presentation">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-[480px] rounded-[30px] bg-[linear-gradient(135deg,#55D6FF_0%,#79A8FF_32%,#C9B4FF_58%,#77F0B2_100%)] p-[1.5px] shadow-[0_30px_90px_rgba(8,11,58,0.28),0_0_32px_rgba(85,214,255,0.18),0_0_28px_rgba(119,240,178,0.14)] outline-none"
      >
        <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[34px] bg-[linear-gradient(135deg,rgba(85,214,255,0.28),rgba(121,168,255,0.16),rgba(119,240,178,0.22))] blur-[22px]" aria-hidden="true" />
        <section
          className="relative overflow-hidden rounded-[28px] bg-white text-center"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(80,96,120,0.08) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,0.99), rgba(248,251,255,0.97))",
            backgroundSize: "10px 10px, 100% 100%",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t("review.success.closeAria")}
            title={t("review.success.closeAria")}
            className="absolute end-4 top-4 grid size-9 place-items-center rounded-full border border-[#D8DDF2] bg-white/90 text-[#697085] shadow-[0_8px_20px_rgba(55,65,130,0.08)] transition hover:border-[#AEB7F7] hover:text-[#080B3A]"
          >
            <XIcon className="size-4" />
          </button>

          <div className="px-7 pb-7 pt-12">
            <div className="mx-auto grid size-[92px] place-items-center rounded-full bg-[#EEF4FF] text-[#101BD8] shadow-[0_18px_46px_rgba(16,27,216,0.16)]">
              <SendSparkleIcon className="size-12" />
            </div>
            <h2 id={titleId} className="mt-7 text-[28px] font-semibold leading-9 text-[#080B3A]">
              {t("review.success.title")}
            </h2>
            <p id={descriptionId} className="mx-auto mt-3 max-w-[340px] text-[15px] font-medium leading-6 text-[#697085]">
              {t("review.success.timeSaved", { minutes: formatNumber(24) })}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#D8DDF2] bg-white/72 px-5 py-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-[#D8DDF2] bg-white px-5 text-[14px] font-semibold text-[#080B3A] shadow-[0_8px_20px_rgba(55,65,130,0.06)] transition hover:border-[#AEB7F7] hover:bg-[#F8FBFF]"
            >
              {t("review.success.backHome")}
            </button>
            <button
              type="button"
              onClick={onSeeDoc}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#080B3A] px-5 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(8,11,58,0.22)] transition hover:bg-[#11165a]"
            >
              {t("review.success.seeDocument")}
              <ArrowRightIcon className={`size-4 ${direction === "rtl" ? "rotate-180" : ""}`} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);
}

function SendSparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M8 25.5 39.5 8 31 40l-7.8-13.4L8 25.5Z" fill="currentColor" opacity=".14" />
      <path d="M8 25.5 39.5 8 31 40l-7.8-13.4L8 25.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="3" />
      <path d="M23.2 26.6 39.5 8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      <path d="m14 8 1.2 3.5L19 13l-3.8 1.5L14 18l-1.3-3.5L9 13l3.7-1.5L14 8ZM36 24l.9 2.4 2.6.9-2.6 1-.9 2.7-1-2.7-2.5-1 2.5-.9L36 24Z" fill="currentColor" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}
