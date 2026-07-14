"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import GCCReviewBrand from "@/components/review/GCCReviewBrand";
import GCCReviewLanguageSelector from "@/components/review/GCCReviewLanguageSelector";
import GCCReviewStepIndicator from "@/components/review/GCCReviewStepIndicator";
import { useGCCLocale } from "@/hooks/useGCCLocale";

type GCCReviewShellProps = {
  title: string;
  subtitle: string;
  step: 1 | 2 | 3;
  children: ReactNode;
};

export default function GCCReviewShell({ title, subtitle, step, children }: GCCReviewShellProps) {
  const router = useRouter();
  const { t } = useGCCLocale();

  return (
    <main
      className="min-h-screen overflow-x-hidden px-3.5 py-6 text-[#212332] sm:px-6 lg:px-8"
      style={{
        backgroundImage:
          "radial-gradient(circle at 15% 10%, rgba(205,255,174,.38), transparent 36%), radial-gradient(circle at 78% 92%, rgba(199,205,255,.28), transparent 42%), radial-gradient(circle, rgba(80,96,120,.08) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 100% 100%, 9px 9px",
        backgroundColor: "#fbfcf8",
      }}
    >
      <div className="mx-auto w-full max-w-[1180px]">
        <header className="flex items-start justify-between gap-4">
          <GCCReviewBrand />
          <div className="flex items-center gap-2.5">
            <GCCReviewLanguageSelector />
            <button
              type="button"
              onClick={() => router.push("/ambient-listening")}
              aria-label={t("review.closeAria")}
              title={t("review.closeAria")}
              className="grid size-11 place-items-center rounded-full border border-[#D8DDF2] bg-white/75 text-[#080B3A] shadow-[0_10px_28px_rgba(55,65,130,0.08)] transition hover:border-[#AEB7F7] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5B61F6]/20"
            >
              <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
                <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </header>

        <section className="mt-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[34px] font-medium leading-[40px] text-[#080B3A] sm:text-[42px] sm:leading-[48px]">{title}</h1>
              <MagicWandIcon className="size-7 shrink-0 text-[#5B61F6]" />
            </div>
            <p className="mt-2 max-w-[650px] text-[16px] font-medium leading-6 text-[#4F5668] sm:text-[18px]">{subtitle}</p>
          </div>
          <GCCReviewStepIndicator step={step} />
        </section>

        {children}
      </div>
    </main>
  );
}

function MagicWandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m5 19 9.8-9.8M13.5 4.5l.7 2.2 2.3.8-2.3.8-.7 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2ZM18 13l.5 1.5 1.5.5-1.5.5L18 17l-.5-1.5L16 15l1.5-.5L18 13ZM6.5 5l.4 1.1 1.1.4-1.1.4L6.5 8l-.4-1.1L5 6.5l1.1-.4L6.5 5Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
