export default function GCCReviewBrand() {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid size-9 place-items-center text-[#101BD8]" aria-hidden="true">
        <span className="absolute inset-1 rounded-full bg-[#7DDE31]/25 blur-md" />
        <SparkleMark className="relative size-7 drop-shadow-[0_0_12px_rgba(91,97,246,0.22)]" />
      </span>
      <div className="leading-none">
        <p className="text-[25px] font-bold leading-[26px] text-[#101BD8]">Medexa</p>
        <p className="mt-0.5 text-[15px] font-medium leading-[17px] text-[#212332]">Review Assistant</p>
      </div>
    </div>
  );
}

function SparkleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2.8 14.4 9.6 21.2 12 14.4 14.4 12 21.2 9.6 14.4 2.8 12 9.6 9.6 12 2.8Z" fill="currentColor" />
    </svg>
  );
}
