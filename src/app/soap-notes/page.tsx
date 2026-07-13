"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GCCReviewActions from "@/components/review/GCCReviewActions";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import GCCReviewShell from "@/components/review/GCCReviewShell";
import { gccSoapReviewData } from "@/lib/mock/gcc-review-data";

export default function GCCSoapNotesPage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState("");
  const [narrative, setNarrative] = useState(gccSoapReviewData.patientNarrative);
  const [symptoms, setSymptoms] = useState([...gccSoapReviewData.symptoms]);
  const [history, setHistory] = useState(gccSoapReviewData.history);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  return (
    <GCCReviewShell title="SOAP Notes" subtitle="Validate clinical objects generated from ambient recording." step={1}>
      <GCCReviewCardFrame title="Subjective Assessment" isEditing={isEditing} onEditToggle={() => setIsEditing((value) => !value)} minHeightClass="min-h-[650px]">
        <div className="space-y-6">
          <section>
            <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">Patient Narrative</h3>
            <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#697085]">Chief Complaint</p>
            {isEditing ? (
              <textarea
                value={narrative}
                onChange={(event) => setNarrative(event.target.value)}
                className="mt-2 min-h-[142px] w-full resize-none rounded-[15px] border border-[#C7D8F8] bg-[#F5FAFF] p-[18px] text-[15px] font-medium leading-7 text-[#212332] outline-none transition focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10"
              />
            ) : (
              <div className="mt-2 whitespace-pre-line rounded-[15px] border border-[#C7D8F8] bg-[#F5FAFF] p-[18px] text-[15px] font-medium leading-7 text-[#212332]">
                {narrative}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">Symptoms</h3>
            <div className="mt-3 space-y-3">
              {symptoms.map((symptom, index) => (
                <div key={`symptom-${index}`} className="flex items-center gap-3 rounded-[15px] border border-[#E0E7F6] bg-[#F8FBFF] px-4 py-3">
                  <span className="size-2.5 shrink-0 rounded-full bg-[#F4B942]" />
                  {isEditing ? (
                    <input
                      value={symptom}
                      onChange={(event) => setSymptoms((items) => items.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                      className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#212332] outline-none"
                    />
                  ) : (
                    <p className="text-[15px] font-medium text-[#212332]">{symptom}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[18px] font-semibold leading-6 text-[#080B3A]">History</h3>
            {isEditing ? (
              <textarea
                value={history}
                onChange={(event) => setHistory(event.target.value)}
                className="mt-3 min-h-[100px] w-full resize-none rounded-[16px] border border-dashed border-[#AEB7F7] bg-white/80 p-4 text-[15px] font-medium leading-7 text-[#212332] outline-none transition focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10"
              />
            ) : (
              <div className="mt-3 rounded-[16px] border border-dashed border-[#AEB7F7] bg-white/80 p-4 text-[15px] font-medium leading-7 text-[#212332]">
                {history}
              </div>
            )}
          </section>
        </div>
      </GCCReviewCardFrame>

      <GCCReviewActions onExport={() => setToast("SOAP Notes export prepared")} onSend={() => router.push("/billing-intelligence")} />
      {toast && <ReviewToast message={toast} />}
    </GCCReviewShell>
  );
}

function ReviewToast({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#D8DDF2] bg-white px-5 py-3 text-[14px] font-semibold text-[#080B3A] shadow-[0_18px_45px_rgba(55,65,130,0.16)]">
      {message}
    </div>
  );
}
