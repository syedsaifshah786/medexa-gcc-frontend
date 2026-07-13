import type { ReactNode } from "react";
import GCCEditButton from "@/components/review/GCCEditButton";

type GCCReviewCardFrameProps = {
  title: string;
  isEditing: boolean;
  onEditToggle: () => void;
  children: ReactNode;
  minHeightClass?: string;
  editDisabled?: boolean;
};

export default function GCCReviewCardFrame({ title, isEditing, onEditToggle, children, minHeightClass = "min-h-[680px]", editDisabled = false }: GCCReviewCardFrameProps) {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-x-7 top-4 h-full rounded-[30px] border border-[#D8DDF2]/55 bg-white/45 opacity-70" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-12 top-8 h-full rounded-[30px] border border-[#D8DDF2]/40 bg-white/35 opacity-60" aria-hidden="true" />
      <section className={`relative rounded-[30px] bg-[linear-gradient(135deg,#55D6FF_0%,#79A8FF_28%,#C9B4FF_55%,#7DDE31_100%)] p-[1.5px] shadow-[0_28px_80px_rgba(32,45,110,0.13),0_0_28px_rgba(85,214,255,0.12)] ${minHeightClass}`}>
        <div
          className="relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-[28px] bg-white px-5 py-5 sm:px-7 sm:py-6"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(80,96,120,0.06) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,0.99), rgba(249,251,255,0.96))",
            backgroundSize: "9px 9px, 100% 100%",
          }}
        >
          <header className="flex items-center justify-between gap-4 border-b border-[#D8DDF2] pb-4">
            <h2 className="text-[22px] font-semibold leading-7 text-[#080B3A]">{title}</h2>
            <GCCEditButton isEditing={isEditing} onClick={onEditToggle} disabled={editDisabled} />
          </header>
          <div className="flex-1 pt-6">{children}</div>
        </div>
      </section>
    </div>
  );
}
