type GCCReviewActionsProps = {
  onExport: () => void;
  onSend: () => void;
  sendLabel?: string;
  exportLabel?: string;
  disabled?: boolean;
};

export default function GCCReviewActions({ onExport, onSend, sendLabel = "Send", exportLabel = "Export", disabled = false }: GCCReviewActionsProps) {
  return (
    <div className="mt-7 flex flex-col justify-end gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onExport}
        disabled={disabled}
        className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full border border-[#AEB7F7] bg-white px-6 text-[15px] font-semibold text-[#080B3A] shadow-[0_8px_22px_rgba(91,97,246,0.08)] transition hover:border-[#5B61F6] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#AEB7F7] sm:w-[175px]"
      >
        <DownloadIcon className="size-4" />
        {exportLabel}
      </button>
      <button
        type="button"
        onClick={onSend}
        disabled={disabled}
        className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#080B3A] px-6 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(8,11,58,0.22)] transition hover:bg-[#11165a] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#080B3A] sm:w-[175px]"
      >
        {sendLabel}
        <ArrowIcon className="size-4" />
      </button>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}
