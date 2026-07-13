type GCCEditButtonProps = {
  isEditing: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export default function GCCEditButton({ isEditing, onClick, disabled = false }: GCCEditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-[#D8DDF2] bg-white px-4 text-[13px] font-semibold text-[#101BD8] shadow-[0_5px_14px_rgba(16,27,216,0.06)] transition hover:border-[#AEB7F7] hover:bg-[#F7F8FF] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#D8DDF2] disabled:hover:bg-white"
    >
      {isEditing ? <CheckIcon className="size-4" /> : <EditIcon className="size-4" />}
      {isEditing ? "Save" : "Edit"}
    </button>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4.5 19.5h4.2L19 9.2a2.4 2.4 0 0 0 0-3.4l-.8-.8a2.4 2.4 0 0 0-3.4 0L4.5 15.3v4.2Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m13.8 6 4.2 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 6.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
