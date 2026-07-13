"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GCCReviewActions from "@/components/review/GCCReviewActions";
import GCCReviewCardFrame from "@/components/review/GCCReviewCardFrame";
import GCCReviewShell from "@/components/review/GCCReviewShell";
import { gccPatientSummaryData } from "@/lib/mock/gcc-review-data";

export default function GCCPatientSummaryPage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState("");
  const [completed, setCompleted] = useState(false);
  const [intro, setIntro] = useState(gccPatientSummaryData.intro);
  const [improvement, setImprovement] = useState(gccPatientSummaryData.improvement);
  const [followUp, setFollowUp] = useState(gccPatientSummaryData.followUp);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const handleSend = () => {
    if (completed) {
      router.push("/ambient-listening");
      return;
    }

    setCompleted(true);
  };

  return (
    <GCCReviewShell title="Patient Summary" subtitle="Share this Medexa summary with the patient what we worked on." step={3}>
      <GCCReviewCardFrame title="Session Summary Note" isEditing={isEditing} onEditToggle={() => setIsEditing((value) => !value)} minHeightClass="min-h-[700px]">
        <div className="space-y-6">
          {isEditing ? (
            <textarea value={intro} onChange={(event) => setIntro(event.target.value)} className="min-h-[132px] w-full resize-none rounded-[16px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[16px] font-medium leading-8 text-[#212332] outline-none focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10" />
          ) : (
            <p className="text-[16px] font-medium leading-8 text-[#212332]">
              Dear Patient, today you completed <strong className="font-bold text-[#080B3A]">Session 4 of 12</strong> in your therapy plan of care. The session included{" "}
              <span className="rounded-md bg-[#ECEBFF] px-1.5 py-0.5 text-[#101BD8]">gait training</span> and{" "}
              <span className="rounded-md bg-[#ECEBFF] px-1.5 py-0.5 text-[#101BD8]">therapeutic exercises</span> focused on improving lower back pain, fatigue, strength, and balance.
            </p>
          )}

          <section className="rounded-[18px] border border-[#D8DDF2] bg-[#F8FBFF] p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ECEBFF] text-[#5B61F6]">
                <TrendIcon className="size-5" />
              </span>
              <div>
                <h3 className="text-[16px] font-semibold text-[#080B3A]">Key Improvement</h3>
                {isEditing ? (
                  <textarea value={improvement} onChange={(event) => setImprovement(event.target.value)} className="mt-2 min-h-[86px] w-full resize-none rounded-[12px] border border-[#D8DDF2] bg-white p-3 text-[15px] font-medium leading-7 text-[#212332] outline-none" />
                ) : (
                  <p className="mt-2 text-[15px] font-medium leading-7 text-[#212332]">
                    Clinical improvement recorded with <span className="rounded-md bg-[#ECEBFF] px-1.5 py-0.5 text-[#101BD8]">knee flexion increased by 15&deg;</span>.
                  </p>
                )}
              </div>
            </div>
          </section>

          {isEditing ? (
            <textarea value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="min-h-[112px] w-full resize-none rounded-[16px] border border-[#D8DDF2] bg-[#F8FBFF] p-4 text-[16px] font-medium leading-8 text-[#212332] outline-none focus:border-[#5B61F6] focus:ring-4 focus:ring-[#5B61F6]/10" />
          ) : (
            <p className="text-[16px] font-medium leading-8 text-[#212332]">{followUp}</p>
          )}

          <div className="border-t border-dashed border-[#C9CEE4] pt-6">
            <h3 className="text-[18px] font-semibold text-[#080B3A]">Upcoming Care Plan</h3>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {gccPatientSummaryData.carePlan.map((item) => (
                <div key={`${item.day}-${item.date}`} className="rounded-[16px] border border-[#C7D8F8] bg-white p-4 text-center shadow-[0_8px_18px_rgba(55,65,130,0.04)]">
                  <p className="text-[13px] font-semibold text-[#697085]">{item.day}</p>
                  <p className="mt-1 text-[32px] font-bold leading-9 text-[#101BD8]">{item.date}</p>
                  <span className="mx-auto mt-2 block size-2 rounded-full bg-[#5B61F6]" />
                </div>
              ))}
            </div>
            <p className="mt-4 text-[15px] font-medium text-[#697085]">Continuing therapy 3 sessions this week</p>
          </div>

          {completed && (
            <div role="status" className="rounded-[18px] border border-[#BDEFCF] bg-[#F1FFF6] px-4 py-3 text-[15px] font-semibold text-[#147A44]">
              Review completed successfully
            </div>
          )}
        </div>
      </GCCReviewCardFrame>

      <GCCReviewActions onExport={() => setToast("Patient Summary export prepared")} onSend={handleSend} sendLabel={completed ? "Done" : "Send"} />
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

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m4.5 15.5 5-5 3.5 3.5 6.5-7M15.5 7h4v4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}
