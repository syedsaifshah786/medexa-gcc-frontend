"use client";

import { useState } from "react";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import { gccBillingReviewData, type GCCBillingCode } from "@/lib/mock/gcc-review-data";

export default function GCCBillingReviewCard() {
  const [isEditing, setIsEditing] = useState(false);
  const [codes, setCodes] = useState<GCCBillingCode[]>([...gccBillingReviewData.codes]);

  const addCode = () => {
    setCodes((items) => {
      if (items.some((item) => item.id.startsWith(gccBillingReviewData.newCode.id))) {
        return [
          ...items,
          {
            ...gccBillingReviewData.newCode,
            id: `${gccBillingReviewData.newCode.id}-${Date.now()}`,
          },
        ];
      }

      return [...items, gccBillingReviewData.newCode];
    });
  };

  const updateCode = (id: string, field: keyof Pick<GCCBillingCode, "code" | "system" | "status" | "description">, value: string) => {
    setCodes((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  return (
    <GCCReviewCardFrame title="Encounter Coding" isEditing={isEditing} onEditToggle={() => setIsEditing((value) => !value)} minHeightClass="min-h-[690px]">
      <div className="space-y-6">
        <section>
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[18px] font-semibold text-[#080B3A]">Session items</h3>
            <button type="button" onClick={addCode} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#D8DDF2] bg-white px-4 text-[13px] font-semibold text-[#101BD8] transition hover:border-[#AEB7F7] hover:bg-[#F7F8FF]">
              <PlusIcon className="size-4" />
              Add more Codes
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {codes.map((item) => (
              <CodingItem key={item.id} item={item} isEditing={isEditing} onUpdate={updateCode} onDelete={() => setCodes((items) => items.filter((code) => code.id !== item.id))} />
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[18px] font-semibold text-[#080B3A]">Revenue Intelligence</h3>
          <div className="mt-4 space-y-4 rounded-[18px] border border-[#D8DDF2] bg-white/80 p-4">
            {gccBillingReviewData.revenue.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[14px] font-semibold text-[#212332]">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#EEF1FA]">
                  <span
                    className={`block h-2 rounded-full ${item.tone === "green" ? "bg-[#1FC77A]" : "bg-gradient-to-r from-[#101BD8] to-[#5B61F6]"}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[16px] border border-[#F4B5B5] bg-[#FFF4F4] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-[#E45A5A]/12 text-[#E45A5A]">
                <AlertIcon className="size-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-[#080B3A]">Active Denial Loop</h3>
            </div>
            <p className="text-[14px] font-bold text-[#E45A5A]">0 Items</p>
          </div>
        </section>
      </div>
    </GCCReviewCardFrame>
  );
}

function CodingItem({ item, isEditing, onUpdate, onDelete }: { item: GCCBillingCode; isEditing: boolean; onUpdate: (id: string, field: keyof Pick<GCCBillingCode, "code" | "system" | "status" | "description">, value: string) => void; onDelete: () => void }) {
  return (
    <article className="rounded-[16px] border border-[#D8DDF2] bg-white p-4 shadow-[0_8px_22px_rgba(55,65,130,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <input value={item.code} onChange={(event) => onUpdate(item.id, "code", event.target.value)} className="h-8 w-24 rounded-full bg-[#080B3A] px-3 text-[13px] font-bold text-white outline-none" />
            ) : (
              <span className="rounded-full bg-[#080B3A] px-3 py-1.5 text-[13px] font-bold text-white">{item.code}</span>
            )}
            {isEditing ? (
              <input value={item.system} onChange={(event) => onUpdate(item.id, "system", event.target.value)} className="h-8 w-28 rounded-full border border-[#D8DDF2] bg-white px-3 text-[12px] font-semibold text-[#080B3A] outline-none" />
            ) : (
              <span className="rounded-full border border-[#D8DDF2] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#080B3A]">{item.system}</span>
            )}
          </div>
          {isEditing ? (
            <input value={item.description} onChange={(event) => onUpdate(item.id, "description", event.target.value)} className="mt-3 w-full rounded-[10px] border border-[#D8DDF2] bg-[#F8FBFF] px-3 py-2 text-[15px] font-medium text-[#212332] outline-none" />
          ) : (
            <p className="mt-3 text-[15px] font-medium text-[#212332]">{item.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge item={item} isEditing={isEditing} onUpdate={onUpdate} />
          <button type="button" onClick={onDelete} aria-label={`Delete ${item.code}`} className="grid size-8 place-items-center rounded-full text-[#697085] transition hover:bg-[#FFF4F4] hover:text-[#E45A5A]">
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ item, isEditing, onUpdate }: { item: GCCBillingCode; isEditing: boolean; onUpdate: (id: string, field: keyof Pick<GCCBillingCode, "code" | "system" | "status" | "description">, value: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-bold text-[#1FC77A]">
      {item.statusType === "matched" ? <LinkIcon className="size-4" /> : <CheckCircleIcon className="size-4" />}
      {isEditing ? (
        <input value={item.status} onChange={(event) => onUpdate(item.id, "status", event.target.value)} className="h-8 w-28 rounded-full border border-[#D8DDF2] px-3 text-[12px] font-semibold text-[#212332] outline-none" />
      ) : (
        <span>{item.status}</span>
      )}
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

function TrashIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2m-9 0 1 13h8l1-13" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function CheckCircleIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m8.5 12.3 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" /></svg>;
}

function LinkIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M9.5 14.5 14.5 9.5M10.5 7.5l1.2-1.2a4 4 0 0 1 5.7 5.7l-1.2 1.2M13.5 16.5l-1.2 1.2a4 4 0 0 1-5.7-5.7l1.2-1.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>;
}

function AlertIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M12 8v5M12 16.5v.1M4.8 19h14.4L12 4.7 4.8 19Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}
