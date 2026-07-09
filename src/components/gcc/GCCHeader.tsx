"use client";

import Link from "next/link";
import { useState } from "react";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </svg>
);

export default function GCCHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState("EN");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_8px_30px_rgba(44,55,105,0.05)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
          >
            <span className="flex w-4 flex-col gap-[3px]">
              <i className="h-[2px] rounded-full bg-current" />
              <i className="h-[2px] rounded-full bg-current" />
              <i className="h-[2px] rounded-full bg-current" />
            </span>
          </button>
          {menuOpen && (
            <nav className="absolute left-0 top-12 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              <Link href="/session" className="block rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
                GCC Session
              </Link>
              <button type="button" className="mt-1 w-full rounded-xl px-4 py-3 text-left text-sm text-slate-500">
                Patient sessions
              </button>
            </nav>
          )}
        </div>

        <Link href="/session" className="flex items-center gap-2 text-[21px] font-extrabold tracking-[-0.04em] text-[#4c46e8]">
          <span className="grid size-7 place-items-center rounded-[9px] bg-gradient-to-br from-[#6557f5] to-[#3933bd] text-sm text-white shadow-md shadow-indigo-200">M</span>
          <span className="hidden min-[390px]:inline">medexa</span>
        </Link>

        <label className="ml-2 hidden h-10 max-w-lg flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50/70 px-4 text-slate-400 transition focus-within:border-indigo-300 focus-within:bg-white md:flex">
          <SearchIcon />
          <input
            type="search"
            aria-label="Search patients and sessions"
            placeholder="Search patients, sessions..."
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button type="button" aria-label="Notifications" className="relative grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
              <path d="M18 9.7c0-3.4-2.2-5.7-6-5.7S6 6.3 6 9.7c0 4.6-2 5.3-2 6.5h16c0-1.2-2-1.9-2-6.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
              <path d="M9.7 19a2.5 2.5 0 0 0 4.6 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
            </svg>
            <span className="absolute right-0.5 top-0.5 size-2 rounded-full border-2 border-white bg-rose-500" />
          </button>

          <button
            type="button"
            onClick={() => setLanguage((value) => (value === "EN" ? "AR" : "EN"))}
            className="flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M4.5 12h15M12 4c2.6 2.5 3.5 5.2 3.5 8s-.9 5.5-3.5 8c-2.6-2.5-3.5-5.2-3.5-8S9.4 6.5 12 4Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            {language}
          </button>

          <button type="button" aria-label="Doctor profile" className="flex items-center gap-2 rounded-full py-1 sm:pr-1">
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#d8c5b8] to-[#8a6556] text-xs font-bold text-white ring-2 ring-white shadow-md">SM</span>
            <span className="hidden text-left lg:block">
              <strong className="block text-xs text-slate-800">Dr. Sarah Miller</strong>
              <small className="block text-[10px] text-slate-400">General Physician</small>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
