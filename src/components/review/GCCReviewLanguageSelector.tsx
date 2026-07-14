"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { GCCLocale } from "@/i18n/types";

const languages = [
  { value: "en", labelKey: "header.languageEnglish" },
  { value: "ar", labelKey: "header.languageArabic" },
] as const satisfies ReadonlyArray<{ value: GCCLocale; labelKey: string }>;

export default function GCCReviewLanguageSelector() {
  const { locale, setLocale, t } = useGCCLocale();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const offeredLanguage = languages.find((language) => language.value !== locale) ?? languages[1];
  const selectedLanguage = languages.find((language) => language.value === locale) ?? languages[0];

  useEffect(() => {
    if (!isOpen) return;

    const selectedIndex = languages.findIndex((language) => language.value === locale);
    const focusFrame = window.requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, locale]);

  const selectLocale = (nextLocale: GCCLocale) => {
    setLocale(nextLocale);
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? languages.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1 + languages.length) % languages.length
          : (currentIndex - 1 + languages.length) % languages.length;
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="gcc-review-language-menu"
        aria-label={`${t("header.chooseLanguage")}: ${t(selectedLanguage.labelKey)}`}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-[#D8DDF2] bg-white/80 px-4 text-[13px] font-semibold text-[#080B3A] shadow-[0_10px_28px_rgba(55,65,130,0.08)] transition hover:border-[#AEB7F7] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5B61F6]/20"
      >
        <LanguageIcon className="size-4 text-[#101BD8]" />
        <span lang={offeredLanguage.value} dir={offeredLanguage.value === "ar" ? "rtl" : "ltr"}>
          {t(offeredLanguage.labelKey)}
        </span>
        <ChevronIcon className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          id="gcc-review-language-menu"
          role="menu"
          aria-label={t("header.chooseLanguage")}
          onKeyDown={handleMenuKeyDown}
          className="absolute end-0 top-[calc(100%+8px)] z-50 min-w-40 overflow-hidden rounded-2xl border border-[#D8DDF2] bg-white p-1.5 shadow-[0_18px_48px_rgba(55,65,130,0.16)]"
        >
          {languages.map((language, index) => {
            const isSelected = language.value === locale;
            return (
              <button
                key={language.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                aria-label={isSelected ? t("header.languageSelected", { language: t(language.labelKey) }) : t(language.labelKey)}
                onClick={() => selectLocale(language.value)}
                className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-start text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B61F6]/30 ${
                  isSelected ? "bg-[#F0F1FF] text-[#101BD8]" : "text-[#212332] hover:bg-[#F8F9FF]"
                }`}
              >
                <span lang={language.value} dir={language.value === "ar" ? "rtl" : "ltr"}>
                  {t(language.labelKey)}
                </span>
                {isSelected && <CheckIcon className="size-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M4 5h9M9 3v2m1.5 12 4-9m2 9-4-9m1 6h5M6.5 8c.7 2.1 2.2 3.8 4.5 5M11 8c-.8 2.9-3 5.1-6 6.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path d="m4.5 10.5 3.2 3.2 7.8-7.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
