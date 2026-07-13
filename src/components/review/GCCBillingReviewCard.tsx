"use client";

import { useEffect, useState } from "react";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import type { GCCBillingIntelligence, GCCBillingSessionItem } from "@/lib/gcc/session-api";

type GCCBillingReviewCardProps = {
  billingIntelligence: GCCBillingIntelligence | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

type EditableBillingItem = GCCBillingSessionItem & {
  id: string;
};

export default function GCCBillingReviewCard({ billingIntelligence, isLoading, errorMessage, onRetry }: GCCBillingReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState<EditableBillingItem[]>([]);
  const hasData = Boolean(billingIntelligence);

  useEffect(() => {
    setIsEditing(false);
    setItems(
      (billingIntelligence?.session_items ?? []).map((item, index) => ({
        ...item,
        id: item.id ?? `${item.code || "session-item"}-${index}`,
      })),
    );
  }, [billingIntelligence]);

  const updateItem = (id: string, field: keyof Pick<EditableBillingItem, "code" | "coding_system" | "status" | "description">, value: string) => {
    setItems((currentItems) => currentItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  return (
    <GCCReviewCardFrame title="Encounter Coding" isEditing={isEditing} onEditToggle={() => setIsEditing((value) => !value)} minHeightClass="min-h-[690px]" editDisabled={!hasData}>
      {isLoading ? (
        <ReviewLoadingState />
      ) : errorMessage ? (
        <ReviewErrorState message={errorMessage} onRetry={onRetry} />
      ) : !billingIntelligence ? (
        <ReviewEmptyState />
      ) : (
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-[18px] font-semibold text-[#080B3A]">Session items</h3>
            </div>

            <div className="mt-4 space-y-3">
              {items.length > 0 ? (
                items.map((item) => (
                  <CodingItem key={item.id} item={item} isEditing={isEditing} onUpdate={updateItem} onDelete={() => setItems((currentItems) => currentItems.filter((code) => code.id !== item.id))} />
                ))
              ) : (
                <div className="rounded-[16px] border border-[#D8DDF2] bg-white/80 p-4 text-[15px] font-semibold text-[#697085]">No supported GCC coding recommendations were generated.</div>
              )}
            </div>
          </section>

          {(billingIntelligence.dx_support_confidence !== null || billingIntelligence.claims_readiness !== null) && (
            <section>
              <h3 className="text-[18px] font-semibold text-[#080B3A]">Revenue Intelligence</h3>
              <div className="mt-4 space-y-4 rounded-[18px] border border-[#D8DDF2] bg-white/80 p-4">
                {billingIntelligence.dx_support_confidence !== null && <ProgressRow label="DX Support Confidence" value={billingIntelligence.dx_support_confidence} tone="green" />}
                {billingIntelligence.claims_readiness !== null && <ProgressRow label="Claims Readiness" value={billingIntelligence.claims_readiness} tone="blue" />}
              </div>
            </section>
          )}

          {billingIntelligence.denial_items.length > 0 && (
            <section className="rounded-[16px] border border-[#F4B5B5] bg-[#FFF4F4] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-[#E45A5A]/12 text-[#E45A5A]">
                    <AlertIcon className="size-5" />
                  </span>
                  <h3 className="text-[15px] font-semibold text-[#080B3A]">Active Denial Loop</h3>
                </div>
                <p className="text-[14px] font-bold text-[#E45A5A]">{billingIntelligence.denial_items.length} Items</p>
              </div>
              <div className="mt-3 space-y-2 text-[14px] font-medium text-[#212332]">
                {billingIntelligence.denial_items.map((item, index) => (
                  <p key={`denial-${index}`}>{item}</p>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </GCCReviewCardFrame>
  );
}

function CodingItem({ item, isEditing, onUpdate, onDelete }: { item: EditableBillingItem; isEditing: boolean; onUpdate: (id: string, field: keyof Pick<EditableBillingItem, "code" | "coding_system" | "status" | "description">, value: string) => void; onDelete: () => void }) {
  return (
    <article className="rounded-[16px] border border-[#D8DDF2] bg-white p-4 shadow-[0_8px_22px_rgba(55,65,130,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.code &&
              (isEditing ? (
                <input value={item.code} onChange={(event) => onUpdate(item.id, "code", event.target.value)} className="h-8 w-24 rounded-full bg-[#080B3A] px-3 text-[13px] font-bold text-white outline-none" />
              ) : (
                <span className="rounded-full bg-[#080B3A] px-3 py-1.5 text-[13px] font-bold text-white">{item.code}</span>
              ))}
            {item.coding_system &&
              (isEditing ? (
                <input value={item.coding_system} onChange={(event) => onUpdate(item.id, "coding_system", event.target.value)} className="h-8 w-28 rounded-full border border-[#D8DDF2] bg-white px-3 text-[12px] font-semibold text-[#080B3A] outline-none" />
              ) : (
                <span className="rounded-full border border-[#D8DDF2] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#080B3A]">{item.coding_system}</span>
              ))}
          </div>
          {isEditing ? (
            <input value={item.description} onChange={(event) => onUpdate(item.id, "description", event.target.value)} className="mt-3 w-full rounded-[10px] border border-[#D8DDF2] bg-[#F8FBFF] px-3 py-2 text-[15px] font-medium text-[#212332] outline-none" />
          ) : (
            item.description && <p className="mt-3 text-[15px] font-medium text-[#212332]">{item.description}</p>
          )}
          {item.evidence && <p className="mt-3 rounded-[12px] bg-[#F8FBFF] px-3 py-2 text-[13px] font-medium leading-6 text-[#697085]">{item.evidence}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {item.status && <StatusBadge item={item} isEditing={isEditing} onUpdate={onUpdate} />}
          <button type="button" onClick={onDelete} aria-label={item.code ? `Delete ${item.code}` : "Delete coding item"} className="grid size-8 place-items-center rounded-full text-[#697085] transition hover:bg-[#FFF4F4] hover:text-[#E45A5A]">
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ item, isEditing, onUpdate }: { item: EditableBillingItem; isEditing: boolean; onUpdate: (id: string, field: keyof Pick<EditableBillingItem, "code" | "coding_system" | "status" | "description">, value: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-bold text-[#1FC77A]">
      <CheckCircleIcon className="size-4" />
      {isEditing ? (
        <input value={item.status} onChange={(event) => onUpdate(item.id, "status", event.target.value)} className="h-8 w-28 rounded-full border border-[#D8DDF2] px-3 text-[12px] font-semibold text-[#212332] outline-none" />
      ) : (
        <span>{item.status}</span>
      )}
    </div>
  );
}

function ProgressRow({ label, value, tone }: { label: string; value: number; tone: "green" | "blue" }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between text-[14px] font-semibold text-[#212332]">
        <span>{label}</span>
        <span>{safeValue}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#EEF1FA]">
        <span className={`block h-2 rounded-full ${tone === "green" ? "bg-[#1FC77A]" : "bg-gradient-to-r from-[#101BD8] to-[#5B61F6]"}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function ReviewEmptyState() {
  return (
    <div className="rounded-[18px] border border-[#D8DDF2] bg-white/80 p-5">
      <p className="text-[15px] font-semibold text-[#080B3A]">No completed session data is available yet.</p>
      <p className="mt-2 text-[14px] font-medium text-[#697085]">Complete and stop a live session to generate this review.</p>
    </div>
  );
}

function ReviewErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[18px] border border-[#F4B5B5] bg-[#FFF8F8] p-5">
      <p className="text-[15px] font-semibold text-[#080B3A]">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 h-9 rounded-full border border-[#AEB7F7] bg-white px-4 text-[13px] font-semibold text-[#101BD8] transition hover:border-[#5B61F6]">
        Retry
      </button>
    </div>
  );
}

function ReviewLoadingState() {
  return (
    <div className="space-y-4" aria-label="Loading session review data">
      <div className="h-20 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
      <div className="h-28 animate-pulse rounded-[18px] bg-[#EEF1FA]" />
      <div className="h-16 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2m-9 0 1 13h8l1-13" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function CheckCircleIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m8.5 12.3 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" /></svg>;
}

function AlertIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M12 8v5M12 16.5v.1M4.8 19h14.4L12 4.7 4.8 19Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}
