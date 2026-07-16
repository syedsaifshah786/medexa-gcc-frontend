"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowUpRight, Download, Globe2, Shield, UserRound, X } from "lucide-react";
import { useGCCLocale } from "@/hooks/useGCCLocale";

export type GCCSendDestination = "general" | "rcm" | "nphies" | "patient";

type GCCReviewActionsProps = {
  onExport: () => void;
  onSend: (destination: GCCSendDestination) => void;
  sendLabel?: string;
  exportLabel?: string;
  disabled?: boolean;
  enableSendDestinations?: boolean;
};

export default function GCCReviewActions({
  onExport,
  onSend,
  sendLabel,
  exportLabel,
  disabled = false,
  enableSendDestinations = false,
}: GCCReviewActionsProps) {
  const { direction, t } = useGCCLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const resolvedExportLabel = exportLabel ?? t("review.export");
  const resolvedSendLabel = sendLabel ?? (enableSendDestinations ? t("review.sendTo") : t("review.send"));

  useEffect(() => {
    if (!isExpanded) return;

    const closeOnOutsidePress = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && groupRef.current?.contains(event.target)) return;
      setIsExpanded(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsExpanded(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isExpanded]);

  const send = (destination: GCCSendDestination) => {
    setIsExpanded(false);
    onSend(destination);
  };

  const collapse = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsExpanded(false);
  };

  return (
    <div className="mt-7 flex max-w-full items-center justify-end gap-3 overflow-x-auto pb-1 sm:overflow-visible">
      <button
        type="button"
        onClick={onExport}
        disabled={disabled}
        aria-label={t("review.exportAria")}
        className="inline-flex h-[56px] w-[186px] shrink-0 items-center justify-center gap-3 rounded-full border border-[#AEB7F7] bg-white/80 px-6 text-[16px] font-medium text-[#080B3A] shadow-[0_8px_22px_rgba(91,97,246,0.08)] transition hover:border-[#5B61F6] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Download className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />
        {resolvedExportLabel}
      </button>

      {enableSendDestinations ? (
        <div ref={groupRef} className="flex shrink-0 items-center" dir={direction}>
          <div className="relative z-20 flex h-[56px] w-[198px] shrink-0 items-stretch overflow-hidden rounded-full bg-[#080B3A] text-white shadow-[0_14px_30px_rgba(8,11,58,0.22)]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => isExpanded ? send("general") : setIsExpanded(true)}
              aria-expanded={isExpanded}
              aria-controls="patient-summary-send-options"
              aria-label={isExpanded ? "Send patient summary" : "Open send destinations"}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 ps-6 text-[16px] font-medium transition hover:bg-[#11165a] focus-visible:z-10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {resolvedSendLabel}
              {!isExpanded && <ArrowUpRight className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />}
            </button>
            {isExpanded && (
              <button
                type="button"
                onClick={collapse}
                aria-label="Close send destinations"
                className="grid w-14 shrink-0 place-items-center pe-2 text-white/90 transition hover:bg-white/10 hover:text-white focus-visible:z-10"
              >
                <X className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            id="patient-summary-send-options"
            aria-hidden={!isExpanded}
            className={`relative z-10 flex h-[56px] items-stretch overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isExpanded
                ? "max-w-[390px] translate-x-0 opacity-100"
                : direction === "rtl"
                  ? "pointer-events-none max-w-0 translate-x-4 opacity-0"
                  : "pointer-events-none max-w-0 -translate-x-4 opacity-0"
            }`}
          >
            <DestinationButton
              label="RCM"
              ariaLabel="Send to RCM"
              icon={<Shield className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />}
              disabled={disabled}
              tabIndex={isExpanded ? 0 : -1}
              onClick={() => send("rcm")}
              className="-ms-px w-[112px]"
            />
            <DestinationButton
              label="NPHIES"
              ariaLabel="Send to NPHIES"
              icon={<Globe2 className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />}
              disabled={disabled}
              tabIndex={isExpanded ? 0 : -1}
              onClick={() => send("nphies")}
              className="-ms-px w-[132px]"
            />
            <DestinationButton
              label={t("review.sendTo.patient")}
              ariaLabel="Send to Patient"
              icon={<UserRound className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />}
              disabled={disabled}
              tabIndex={isExpanded ? 0 : -1}
              onClick={() => send("patient")}
              className="-ms-px w-[132px]"
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSend("general")}
          disabled={disabled}
          aria-label={t("review.sendAria")}
          className="inline-flex h-[56px] w-[186px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#080B3A] px-6 text-[16px] font-medium text-white shadow-[0_14px_30px_rgba(8,11,58,0.22)] transition hover:bg-[#11165a] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {resolvedSendLabel}
          <ArrowUpRight className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function DestinationButton({
  label,
  ariaLabel,
  icon,
  className,
  disabled,
  tabIndex,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  className: string;
  disabled: boolean;
  tabIndex: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      tabIndex={tabIndex}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#b9bad0] bg-[#f0f0ff] px-4 text-[16px] font-medium text-[#111435] shadow-[0_8px_18px_rgba(37,38,83,0.12)] transition hover:z-10 hover:bg-white focus-visible:z-20 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}
