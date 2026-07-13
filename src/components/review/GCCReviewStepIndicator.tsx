type GCCReviewStepIndicatorProps = {
  step: 1 | 2 | 3;
};

export default function GCCReviewStepIndicator({ step }: GCCReviewStepIndicatorProps) {
  return (
    <div className="shrink-0">
      <p className="text-right text-[16px] font-semibold leading-5 text-[#080B3A]">Step {String(step).padStart(2, "0")}/03</p>
      <div className="mt-3 flex items-center justify-end gap-2">
        {[1, 2, 3].map((item) => (
          <span
            key={item}
            className={`h-[7px] rounded-full transition-all ${item === step ? "w-12 bg-[#101BD8]" : "w-5 bg-[#D8DDF2]"}`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
