"use client";

import { useState } from "react";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import { useGCCLocale } from "@/hooks/useGCCLocale";
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

type BillingDraft = {
  source: GCCBillingIntelligence | null;
  isEditing: boolean;
  items: EditableBillingItem[];
};

function createBillingDraft(source: GCCBillingIntelligence | null): BillingDraft {
  return {
    source,
    isEditing: false,
    items: (source?.items ?? []).map((item, index) => ({
      ...item,
      id: item.id ?? `${item.code || "session-item"}-${index}`,
    })),
  };
}

export default function GCCBillingReviewCard({ billingIntelligence, isLoading, errorMessage, onRetry }: GCCBillingReviewCardProps) {
  const { formatNumber, t } = useGCCLocale();
  const [draft, setDraft] = useState<BillingDraft>(() => createBillingDraft(billingIntelligence));
  const activeDraft = draft.source === billingIntelligence ? draft : createBillingDraft(billingIntelligence);
  const { isEditing, items } = activeDraft;
  const hasData = Boolean(billingIntelligence);

  const updateItem = (id: string, field: keyof Pick<EditableBillingItem, "code" | "codingSystem" | "status" | "description">, value: string) => {
    setDraft({
      ...activeDraft,
      items: items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    });
  };

  return (
    <GCCReviewCardFrame title={billingIntelligence?.sectionTitle ?? t("review.billing.cardTitle")} isEditing={isEditing} onEditToggle={() => setDraft({ ...activeDraft, isEditing: !isEditing })} minHeightClass="min-h-[690px]" editDisabled={!hasData}>
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
              <h3 className="text-[18px] font-semibold text-[#080B3A]">{billingIntelligence.sessionItemsTitle ?? t("review.billing.sessionItems")}</h3>
              <button
                type="button"
                onClick={() => {
                  const id = `new-code-${Date.now()}`;
                  setDraft({
                    ...activeDraft,
                    isEditing: true,
                    items: [...items, { id, code: "", codingSystem: "", description: "", status: "", evidence: "", confidence: null }],
                  });
                }}
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#071bd8] transition hover:text-[#020e8f]"
              >
                <span className="text-[28px] font-light leading-none" aria-hidden="true">+</span>
                {t("review.billing.addMoreCodes")}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {items.length > 0 ? (
                items.map((item) => (
                  <CodingItem key={item.id} item={item} isEditing={isEditing} onUpdate={updateItem} onDelete={() => setDraft({ ...activeDraft, items: items.filter((code) => code.id !== item.id) })} />
                ))
              ) : (
                <div className="rounded-[16px] border border-[#D8DDF2] bg-white/80 p-4 text-[15px] font-semibold text-[#697085]">{t("review.billing.noCoding")}</div>
              )}
            </div>
          </section>

          {(billingIntelligence.dxSupportConfidence !== null || billingIntelligence.claimsReadiness !== null) && (
            <section>
              <h3 className="text-[18px] font-semibold text-[#080B3A]">{billingIntelligence.revenueTitle ?? t("review.billing.revenueIntelligence")}</h3>
              <div className="mt-4 space-y-4">
                {billingIntelligence.dxSupportConfidence !== null && <ProgressRow label={t("review.billing.dxSupportConfidence")} value={billingIntelligence.dxSupportConfidence} tone="green" />}
                {billingIntelligence.claimsReadiness !== null && <ProgressRow label={t("review.billing.claimsReadiness")} value={billingIntelligence.claimsReadiness} tone="blue" />}
              </div>
            </section>
          )}

          <section className="rounded-[13px] border border-[#f5caca] bg-[#fff2f2] px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-white text-[#ef5757]">
                    <AlertIcon className="size-5" />
                  </span>
                  <h3 className="text-[15px] font-semibold text-[#080B3A]">{billingIntelligence.denialLoopTitle ?? t("review.billing.activeDenialLoop")}</h3>
                </div>
                <p className="rounded bg-white px-2 py-1 text-[12px] font-bold text-[#922525]">
                  {formatNumber(billingIntelligence.denialItems.length)} Items
                </p>
              </div>
              {billingIntelligence.denialItems.length > 0 && <div className="mt-3 space-y-2 text-[14px] font-medium text-[#212332]">
                {billingIntelligence.denialItems.map((item, index) => (
                  <p key={`denial-${index}`} dir="auto">{item}</p>
                ))}
              </div>}
            </section>
        </div>
      )}
    </GCCReviewCardFrame>
  );
}

function CodingItem({ item, isEditing, onUpdate, onDelete }: { item: EditableBillingItem; isEditing: boolean; onUpdate: (id: string, field: keyof Pick<EditableBillingItem, "code" | "codingSystem" | "status" | "description">, value: string) => void; onDelete: () => void }) {
  const { t } = useGCCLocale();

  return (
    <article className="rounded-[16px] border border-[#D8DDF2] bg-white p-4 shadow-[0_8px_22px_rgba(55,65,130,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.code &&
              (isEditing ? (
                <input value={item.code} onChange={(event) => onUpdate(item.id, "code", event.target.value)} aria-label={t("review.billing.codeInputAria")} dir="ltr" className="h-8 w-24 rounded-full bg-[#080B3A] px-3 text-left text-[13px] font-bold text-white outline-none" />
              ) : (
                <bdi dir="ltr" className="rounded-md bg-[#11182e] px-3 py-1 text-[13px] font-medium text-white">{item.code}</bdi>
              ))}
            {item.codingSystem &&
              (isEditing ? (
                <input value={item.codingSystem} onChange={(event) => onUpdate(item.id, "codingSystem", event.target.value)} aria-label={t("review.billing.codingSystemInputAria")} dir="ltr" className="h-8 w-28 rounded-full border border-[#D8DDF2] bg-white px-3 text-left text-[12px] font-semibold text-[#080B3A] outline-none" />
              ) : (
                <bdi dir="ltr" className="rounded-md border border-[#9da7ff] bg-white px-2 py-0.5 text-[12px] font-medium text-[#5c606d]">{item.codingSystem}</bdi>
              ))}
          </div>
          {isEditing ? (
            <input value={item.description} onChange={(event) => onUpdate(item.id, "description", event.target.value)} aria-label={t("review.billing.descriptionInputAria")} dir="auto" className="mt-3 w-full rounded-[10px] border border-[#D8DDF2] bg-[#F8FBFF] px-3 py-2 text-[15px] font-medium text-[#212332] outline-none" />
          ) : (
            item.description && <p dir="auto" className="mt-3 text-[15px] font-medium text-[#212332]">{item.description}</p>
          )}
          {item.evidence && <p dir="auto" className="mt-3 rounded-[12px] bg-[#F8FBFF] px-3 py-2 text-[13px] font-medium leading-6 text-[#697085]">{item.evidence}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {item.status && <StatusBadge item={item} isEditing={isEditing} onUpdate={onUpdate} />}
          <button type="button" onClick={onDelete} aria-label={item.code ? t("review.billing.deleteCodeAria", { code: item.code }) : t("review.billing.deleteItemAria")} className="grid size-8 place-items-center rounded-full text-[#697085] transition hover:bg-[#FFF4F4] hover:text-[#E45A5A]">
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ item, isEditing, onUpdate }: { item: EditableBillingItem; isEditing: boolean; onUpdate: (id: string, field: keyof Pick<EditableBillingItem, "code" | "codingSystem" | "status" | "description">, value: string) => void }) {
  const { t } = useGCCLocale();

  return (
    <div className="flex items-center gap-2 text-[12px] font-bold text-[#1FC77A]">
      {item.status.trim().toLowerCase() === "matched" ? <LinkIcon className="size-4" /> : <CheckCircleIcon className="size-4" />}
      {isEditing ? (
        <input value={item.status} onChange={(event) => onUpdate(item.id, "status", event.target.value)} aria-label={t("review.billing.statusInputAria")} dir="auto" className="h-8 w-28 rounded-full border border-[#D8DDF2] px-3 text-[12px] font-semibold text-[#212332] outline-none" />
      ) : (
        <span dir="auto">{translateBillingStatus(item.status, t)}</span>
      )}
    </div>
  );
}

function ProgressRow({ label, value, tone }: { label: string; value: number; tone: "green" | "blue" }) {
  const { formatNumber } = useGCCLocale();
  const normalizedValue = Math.abs(value) > 1 ? value : value * 100;
  const safeValue = Math.max(0, Math.min(100, normalizedValue));
  const formattedValue = `${formatNumber(safeValue)}%`;

  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue} aria-valuetext={formattedValue}>
      <div className="flex items-center justify-between text-[14px] font-semibold text-[#212332]">
        <span>{label}</span>
        <span>{formattedValue}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#EEF1FA]">
        <span className={`block h-2 rounded-full ${tone === "green" ? "bg-[#1FC77A]" : "bg-gradient-to-r from-[#101BD8] to-[#5B61F6]"}`} style={{ width: `${safeValue}%`, marginInlineEnd: "auto" }} />
      </div>
    </div>
  );
}

function ReviewEmptyState() {
  const { t } = useGCCLocale();

  return (
    <div className="rounded-[18px] border border-[#D8DDF2] bg-white/80 p-5">
      <p className="text-[15px] font-semibold text-[#080B3A]">{t("review.emptyTitle")}</p>
      <p className="mt-2 text-[14px] font-medium text-[#697085]">{t("review.emptyBody")}</p>
    </div>
  );
}

function ReviewErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useGCCLocale();

  return (
    <div className="rounded-[18px] border border-[#F4B5B5] bg-[#FFF8F8] p-5">
      <p className="text-[15px] font-semibold text-[#080B3A]">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 h-9 rounded-full border border-[#AEB7F7] bg-white px-4 text-[13px] font-semibold text-[#101BD8] transition hover:border-[#5B61F6]">
        {t("review.retry")}
      </button>
    </div>
  );
}

function ReviewLoadingState() {
  const { t } = useGCCLocale();

  return (
    <div className="space-y-4" role="status" aria-label={t("review.loadingAria")}>
      <p className="text-[14px] font-semibold text-[#697085]">{t("review.loadingAria")}</p>
      <div aria-hidden="true" className="h-20 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
      <div aria-hidden="true" className="h-28 animate-pulse rounded-[18px] bg-[#EEF1FA]" />
      <div aria-hidden="true" className="h-16 animate-pulse rounded-[16px] bg-[#EEF1FA]" />
    </div>
  );
}

type Translate = ReturnType<typeof useGCCLocale>["t"];

function translateBillingStatus(status: string, t: Translate) {
  const normalizedStatus = status.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  const statusKey: Record<string, string> = {
    supported: "review.billing.status.supported",
    pending: "review.billing.status.pending",
    verified: "review.billing.status.verified",
    complete: "review.billing.status.complete",
    completed: "review.billing.status.completed",
    "requires clinician review": "review.billing.status.requiresReview",
    "requires review": "review.billing.status.requiresReview",
    suggested: "review.billing.status.suggested",
    ready: "review.billing.status.ready",
    cleared: "review.billing.status.cleared",
    queued: "review.billing.status.queued",
    active: "review.billing.status.active",
    inactive: "review.billing.status.inactive",
  };

  const key = statusKey[normalizedStatus];
  return key ? t(key) : status;
}

function TrashIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2m-9 0 1 13h8l1-13" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function CheckCircleIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m8.5 12.3 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" /></svg>;
}

function LinkIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="m9.7 14.3 4.6-4.6M8.2 16.9l-1.1 1.2a3.4 3.4 0 0 1-4.8-4.8l3-3a3.4 3.4 0 0 1 4.8 0M15.8 7.1l1.1-1.2a3.4 3.4 0 1 1 4.8 4.8l-3 3a3.4 3.4 0 0 1-4.8 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>;
}

function AlertIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M12 8v5M12 16.5v.1M4.8 19h14.4L12 4.7 4.8 19Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}
