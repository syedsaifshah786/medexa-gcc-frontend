"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type { GCCUpcomingSession } from "@/types/gcc-patient";

type GCCDeleteSessionDialogProps = {
  session: GCCUpcomingSession | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function GCCDeleteSessionDialog({
  session,
  isDeleting,
  onClose,
  onConfirm,
}: GCCDeleteSessionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const isDeletingRef = useRef(isDeleting);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const sessionId = session?.id;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    isDeletingRef.current = isDeleting;

    if (isDeleting) {
      dialogRef.current?.focus();
    }
  }, [isDeleting]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      if (!isDeletingRef.current) {
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;

      if (previousActiveElement?.isConnected) {
        previousActiveElement.focus();
      } else {
        document.getElementById("gcc-upcoming-sessions-heading")?.focus();
      }
    };
  }, [sessionId]);

  if (!session) {
    return null;
  }

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    const focusableElements = getFocusableElements(dialog);

    if (!dialog || focusableElements.length === 0) {
      event.preventDefault();
      dialog?.focus();
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (!dialog.contains(activeElement)) {
      event.preventDefault();
      (event.shiftKey ? lastFocusable : firstFocusable).focus();
    } else if (
      event.shiftKey &&
      (activeElement === firstFocusable || activeElement === dialog)
    ) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
      className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-[#050816]/45 px-4 py-6 backdrop-blur-[4px]"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={isDeleting}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="relative w-full max-w-[440px] overflow-hidden rounded-[14px] border border-slate-200/90 bg-white shadow-[0_28px_90px_rgba(8,11,58,0.24)] outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Close delete session dialog"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CloseIcon className="size-4" />
        </button>

        <div className="flex items-start gap-3 px-5 py-5 pr-14">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600"
            aria-hidden="true"
          >
            <TrashIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[18px] font-extrabold leading-6 text-slate-950"
            >
              Delete Upcoming Session?
            </h2>
            <p
              id={descriptionId}
              className="mt-2 text-[13px] font-medium leading-5 text-slate-500"
            >
              This will remove the upcoming session for {session.patientName}. This
              action cannot be undone.
            </p>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-rose-600 px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(225,29,72,0.18)] transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <TrashIcon className="size-4" />
            Delete Session
          </button>
        </footer>
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2m-9 0 1 13h8l1-13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
