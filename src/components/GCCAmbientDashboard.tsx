"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import GCCHeader from "@/components/gcc/GCCHeader";
import { useGCCVoiceSession } from "@/hooks/useGCCVoiceSession";

/* eslint-disable @next/next/no-img-element -- Prototype dashboard uses static mocked patient avatars. */

type SessionStatus = "Active" | "Upcoming" | "Pre-Auth Required" | "Auth Pending" | "Completed";
type NphiesStatus = "Cleared" | "Queued" | "Inactive" | "Verified";

type SessionRecord = {
  id: string;
  name: string;
  status: SessionStatus;
  nphies: NphiesStatus;
  refId?: string;
  avatar?: string;
};

type PatientDetails = {
  firstName: string;
  lastName: string;
  dob: string;
  mrn: string;
};

type PatientRecord = PatientDetails & {
  signature: string;
};

type FieldErrors = Partial<Record<keyof PatientDetails, string>>;
type ModalStep = "none" | "details" | "consent";

const initialPatient: PatientDetails = {
  firstName: "",
  lastName: "",
  dob: "",
  mrn: "",
};

const dashboardSessions: SessionRecord[] = [
  { id: "samuel-thompson", name: "Samuel Thompson", status: "Active", nphies: "Cleared", refId: "PA-2026-00847231", avatar: "https://i.pravatar.cc/96?img=12" },
  { id: "fatima-zahra-1", name: "Fatima Zahra", status: "Upcoming", nphies: "Cleared", refId: "PA-2026-00847231", avatar: "https://i.pravatar.cc/96?img=32" },
  { id: "sarah-williams", name: "Sarah Williams", status: "Pre-Auth Required", nphies: "Queued", refId: "PA-2026-00847231", avatar: "https://i.pravatar.cc/96?img=47" },
  { id: "ahmed-abdullah", name: "Ahmed Abdullah", status: "Auth Pending", nphies: "Inactive", refId: "PA-2026-00847231", avatar: "https://i.pravatar.cc/96?img=13" },
  { id: "lina-chen", name: "Lina Chen", status: "Completed", nphies: "Verified", refId: "PA-2026-00937462", avatar: "https://i.pravatar.cc/96?img=29" },
  { id: "jameson-locke", name: "Jameson Locke", status: "Auth Pending", nphies: "Inactive", refId: "PA-2026-00847231", avatar: "https://i.pravatar.cc/96?img=14" },
  { id: "fatima-zahra-2", name: "Fatima Zahra", status: "Upcoming", nphies: "Cleared", avatar: "https://i.pravatar.cc/96?img=45" },
];

const metrics = [
  { label: "Eligibility Verification", value: "98%" },
  { label: "Pre-Auth Success", value: "92%" },
  { label: "Claim Quality Score", value: "95%" },
];

const dueActionItems = [
  { title: "Missing Pre-Authorization", date: "July 05", detail: "Sarah J", context: "Cardiac Rehab", tone: "warning" as const },
  { title: "Coding Review Required", date: "July 05", detail: "Ahmad K", context: "Pri Care Encounter", tone: "warning" as const },
  { title: "Documentation Pending (>24h)", date: "July 05", detail: "Fatima S", context: "Specialist Consult", tone: "success" as const },
  { title: "Claim Validation Needed", date: "July 05", detail: "John D", context: "Post-Op Rec", tone: "warning" as const },
];

const todayInputValue = () => {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export default function GCCAmbientDashboard() {
  const router = useRouter();
  const {
    permissionStatus,
    status: voiceStatus,
    errorMessage: voiceError,
    enableVoiceControl,
    startAmbientCommandListening,
    startSession,
  } = useGCCVoiceSession();
  const [modalStep, setModalStep] = useState<ModalStep>("none");
  const [patientDetails, setPatientDetails] = useState<PatientDetails>(initialPatient);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [savedPatients, setSavedPatients] = useState<PatientRecord[]>([]);
  const [createdSessions, setCreatedSessions] = useState<SessionRecord[]>([]);
  const [toast, setToast] = useState("");

  const sessions = useMemo(() => [...createdSessions, ...dashboardSessions], [createdSessions]);
  const maxDob = useMemo(() => todayInputValue(), []);
  const currentDate = "Tuesday, Jul 13, 2026";

  useEffect(() => {
    if (modalStep === "none") {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [modalStep]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (permissionStatus === "granted") {
      void startAmbientCommandListening();
    }
  }, [permissionStatus, startAmbientCommandListening]);

  const validateDetails = useCallback((details: PatientDetails) => {
    const nextErrors: FieldErrors = {};
    const today = todayInputValue();

    if (!details.firstName.trim()) {
      nextErrors.firstName = "First Name is required.";
    }

    if (!details.lastName.trim()) {
      nextErrors.lastName = "Last Name is required.";
    }

    if (!details.dob) {
      nextErrors.dob = "DOB is required.";
    } else if (details.dob > today) {
      nextErrors.dob = "DOB cannot be a future date.";
    }

    if (!details.mrn.trim()) {
      nextErrors.mrn = "MRN/Reference ID is required.";
    }

    return nextErrors;
  }, []);

  const openDetailsModal = () => {
    setPatientDetails(initialPatient);
    setErrors({});
    setHasAttemptedSubmit(false);
    setSignatureDataUrl("");
    setModalStep("details");
  };

  const closeModal = () => {
    setModalStep("none");
    setErrors({});
    setHasAttemptedSubmit(false);
    setSignatureDataUrl("");
  };

  const updatePatientField = (field: keyof PatientDetails, value: string) => {
    const nextDetails = { ...patientDetails, [field]: value };
    setPatientDetails(nextDetails);

    if (hasAttemptedSubmit) {
      setErrors(validateDetails(nextDetails));
    }
  };

  const submitDetails = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);

    const nextErrors = validateDetails(patientDetails);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setModalStep("consent");
    }
  };

  const completeConsent = () => {
    if (!signatureDataUrl) {
      return;
    }

    const fullName = `${patientDetails.firstName.trim()} ${patientDetails.lastName.trim()}`;
    const savedPatient = {
      ...patientDetails,
      signature: signatureDataUrl,
    };

    setSavedPatients((patients) => [savedPatient, ...patients]);
    setCreatedSessions((items) => [
      {
        id: `created-${Date.now()}`,
        name: fullName,
        status: "Upcoming",
        nphies: "Queued",
        refId: patientDetails.mrn.trim(),
      },
      ...items,
    ]);
    setToast("Patient added successfully.");
    closeModal();
  };

  const startNewSession = async () => {
    const id = await startSession({ source: "manual" });
    if (!id) return;
    router.push(`/session?sessionId=${encodeURIComponent(id)}&autoStart=1&source=manual`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8fc] text-slate-900">
      <GCCHeader />
      <main className="mx-auto w-full max-w-[760px] px-3.5 pb-8 pt-6 sm:px-5 md:px-7 lg:max-w-[1320px] xl:px-8">
        <div className="grid w-full grid-cols-1 items-start gap-y-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)] lg:gap-x-7 xl:gap-x-9">
          <div className="min-w-0">
            <section>
              <p className="mb-1 text-[23px] font-normal leading-7 text-[#171717]">Good Evening,</p>
              <div className="flex flex-col items-start sm:flex-row sm:items-end">
                <h1 className="text-[42px] font-light leading-[46px] tracking-[-1px] text-[#101010] sm:text-[50px] sm:leading-[54px]">Dr. Sarah</h1>
                <p className="mt-1 text-[15px] font-medium leading-5 text-zinc-500 sm:mb-[5px] sm:ml-4 sm:mt-0 sm:text-[16px] sm:leading-[21px]">
                  {currentDate}
                </p>
              </div>
            </section>
            <VoiceControlStatus
              permissionStatus={permissionStatus}
              voiceStatus={voiceStatus}
              errorMessage={voiceError}
              onEnable={async () => {
                if (await enableVoiceControl()) {
                  await startAmbientCommandListening();
                }
              }}
            />
            <DashboardActionButtons onAddPatient={openDetailsModal} onStartSession={startNewSession} className="mt-4 lg:hidden" />
            <NewSessionCallout onStartSession={startNewSession} />
            <OperationalHealth />
            <DueActionItems />
          </div>

          <div className="w-full min-w-0">
            <DashboardActionButtons onAddPatient={openDetailsModal} onStartSession={startNewSession} className="mb-6 hidden lg:flex lg:justify-end" />
            <UpcomingSessions sessions={sessions} />
          </div>
        </div>

        {modalStep === "details" && (
          <Modal
            title="Add Patient Details"
            subtitle="Provide basic info about the patient."
            onClose={closeModal}
            footer={
              <>
                <button type="button" onClick={closeModal} className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  <XIcon className="size-4" />
                  Cancel
                </button>
                <button type="submit" form="patient-details-form" className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#111936] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(17,25,54,0.2)] transition hover:bg-[#18234a]">
                  <ArrowRightIcon className="size-4" />
                  Save & Continue
                </button>
              </>
            }
          >
            <form id="patient-details-form" onSubmit={submitDetails} noValidate className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  id="firstName"
                  label="First Name"
                  value={patientDetails.firstName}
                  error={errors.firstName}
                  onChange={(value) => updatePatientField("firstName", value)}
                  autoComplete="given-name"
                />
                <FormInput
                  id="lastName"
                  label="Last Name"
                  value={patientDetails.lastName}
                  error={errors.lastName}
                  onChange={(value) => updatePatientField("lastName", value)}
                  autoComplete="family-name"
                />
              </div>
              <FormInput
                id="dob"
                label="DOB"
                type="date"
                value={patientDetails.dob}
                error={errors.dob}
                max={maxDob}
                icon={<CalendarIcon className="size-4" />}
                onChange={(value) => updatePatientField("dob", value)}
              />
              <FormInput
                id="mrn"
                label="MRN/Reference ID"
                value={patientDetails.mrn}
                error={errors.mrn}
                helperText="Please enter patient's MRN or reference ID."
                onChange={(value) => updatePatientField("mrn", value)}
              />
            </form>
          </Modal>
        )}

        {modalStep === "consent" && (
          <Modal
            title="PDPL Patient Consent"
            subtitle="By providing the signature, patient consents to share his information."
            onClose={closeModal}
            footer={
              <>
                <button type="button" onClick={closeModal} className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  <XIcon className="size-4" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={completeConsent}
                  disabled={!signatureDataUrl}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#111936] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(17,25,54,0.2)] transition hover:bg-[#18234a] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  <ArrowRightIcon className="size-4" />
                  Save & Continue
                </button>
              </>
            }
          >
            <SignatureCanvas value={signatureDataUrl} onChange={setSignatureDataUrl} />
          </Modal>
        )}

        {toast && (
          <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-[12px] border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
            {toast}
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {savedPatients.length ? `${savedPatients.length} patient records saved.` : ""}
        </span>
      </main>
    </div>
  );
}

function NewSessionCallout({ onStartSession }: { onStartSession: () => void }) {
  return (
    <button
      type="button"
      onClick={onStartSession}
      className="group relative isolate mb-7 mt-[22px] block h-auto w-full cursor-pointer overflow-visible rounded-[20px] bg-[linear-gradient(135deg,#55d6ff_0%,#79a8ff_34%,#c9b4ff_58%,#77f0b2_100%)] p-[2px] text-left shadow-[0_8px_24px_rgba(88,120,255,0.1),0_0_24px_rgba(85,214,255,0.12),0_0_18px_rgba(119,240,178,0.1)] transition hover:-translate-y-px active:translate-y-0 sm:h-24 sm:rounded-[24px]"
      aria-label="Start a new Medexa session"
    >
      <span className="pointer-events-none absolute -inset-2 -z-10 rounded-[26px] bg-[linear-gradient(135deg,rgba(85,214,255,0.22),rgba(121,168,255,0.14),rgba(201,180,255,0.18),rgba(119,240,178,0.18))] opacity-70 blur-[18px] transition group-hover:opacity-80 sm:rounded-[30px]" aria-hidden="true" />
      <span
        className="relative z-10 flex h-full items-center gap-4 overflow-hidden rounded-[18px] px-4 py-4 transition sm:rounded-[22px] sm:px-[22px]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(120,140,180,0.12) 1px, transparent 1px), radial-gradient(circle at top left, rgba(85,214,255,0.1), transparent 35%), radial-gradient(circle at right center, rgba(119,240,178,0.08), transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,251,255,0.94))",
          backgroundSize: "12px 12px, 100% 100%, 100% 100%, 100% 100%",
        }}
      >
        <span className="pointer-events-none absolute -bottom-7 -left-5 size-20 rounded-full bg-cyan-300/14 blur-xl" aria-hidden="true" />
        <span className="relative grid size-9 shrink-0 place-items-center text-cyan-400 drop-shadow-[0_0_9px_rgba(34,211,238,0.38)]">
          <SparklesIcon className="size-8 text-cyan-400" />
        </span>
        <span className="relative min-w-0">
          <span className="mb-1 block text-[20px] font-bold leading-[24px] text-[#171717] sm:text-[21px] sm:leading-[25px]">Starting a new session?</span>
          <span className="block text-[14px] font-normal leading-5 text-[#666b78] sm:whitespace-nowrap sm:text-[15px]">Say &quot;Hey Medexa, start session with David Peter&quot;</span>
        </span>
      </span>
    </button>
  );
}

function VoiceControlStatus({
  permissionStatus,
  voiceStatus,
  errorMessage,
  onEnable,
}: {
  permissionStatus: "unknown" | "prompt" | "granted" | "denied";
  voiceStatus: string;
  errorMessage: string | null;
  onEnable: () => void;
}) {
  if (permissionStatus === "granted" && voiceStatus === "command-listening") {
    return <p className="mt-3 text-[12px] font-medium text-emerald-600">Voice control ready</p>;
  }

  if (permissionStatus === "denied") {
    return <p className="mt-3 text-[12px] font-medium text-rose-600">Microphone permission is required for Medexa voice commands.</p>;
  }

  if (errorMessage) {
    return <p className="mt-3 text-[12px] font-medium text-amber-600">{errorMessage}</p>;
  }

  return (
    <button
      type="button"
      onClick={onEnable}
      className="mt-3 inline-flex h-8 items-center rounded-full border border-indigo-200 bg-white px-3 text-[12px] font-medium text-indigo-700 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition hover:border-indigo-300"
    >
      Enable Voice Control
    </button>
  );
}

function DashboardActionButtons({ onAddPatient, onStartSession, className }: { onAddPatient: () => void; onStartSession: () => void; className?: string }) {
  const buttonClass =
    "inline-flex h-[38px] items-center gap-2 rounded-[19px] border border-indigo-300/60 bg-white px-3.5 text-[13px] font-medium text-slate-800 shadow-[0_4px_12px_rgba(15,23,42,0.05)] transition hover:-translate-y-px hover:border-indigo-400";

  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)}>
      <button type="button" onClick={onAddPatient} className={buttonClass}>
        <UserPlusIcon className="size-3.5 text-indigo-500" />
        Add new Patient
      </button>
      <button type="button" onClick={onStartSession} className={buttonClass}>
        <SparklesIcon className="size-3.5 text-indigo-500" />
        Start new Session
      </button>
    </div>
  );
}

function OperationalHealth() {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mb-[5px] text-[15px] font-normal leading-5 text-[#737373]">Operational Health Score</h2>
          <div className="flex items-end gap-2.5">
            <span className="text-[38px] font-bold leading-[42px] tracking-[-1px] text-slate-950">
              94.8<span className="ml-1 align-super text-[14px] font-medium tracking-normal text-slate-400">%</span>
            </span>
            <span className="mb-2 inline-flex h-[22px] items-center gap-1 rounded-full bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700">
              <ArrowUpIcon className="size-3" />
              2.4%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-h-[72px] rounded-[10px] border border-slate-200 bg-white px-3 py-[11px] shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[11px] font-medium leading-[14px] text-slate-500">{label}</h3>
        <InfoIcon className="size-3.5 shrink-0 text-slate-400" />
      </div>
      <p className="mt-[5px] text-[22px] font-bold leading-6 text-[#5865f2]">{value}</p>
    </article>
  );
}

function DueActionItems() {
  return (
    <section className="mt-6 overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_7px_18px_rgba(15,23,42,0.04)]">
      <div className="flex h-12 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold leading-[18px] text-slate-950">Your Due Action Items</h2>
          <span className="grid size-[21px] place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">7</span>
        </div>
        <button type="button" aria-label="Due action menu" className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
          <MoreHorizontalIcon className="size-4" />
        </button>
      </div>

      <div>
        {dueActionItems.map((item) => (
          <ActionItem key={item.title} {...item} />
        ))}
      </div>

      <button type="button" className="m-2 h-9 w-[calc(100%-16px)] rounded-[7px] bg-indigo-50 text-[13px] font-semibold text-indigo-700 transition hover:bg-indigo-100">
        See All Due Actions
      </button>
    </section>
  );
}

function ActionItem({ title, date, detail, context, tone }: { title: string; date: string; detail: string; context: string; tone: "warning" | "success" }) {
  return (
    <article className="flex min-h-[66px] items-center border-t border-[#eceef4] px-3.5 py-2.5">
      <span className={cx("mr-3 h-8 w-1.5 shrink-0 rounded-[6px]", tone === "warning" ? "bg-amber-400" : "bg-emerald-500")} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[13px] font-medium leading-[17px] text-slate-900">{title}</h3>
        <p className="mt-[3px] truncate text-[11px] font-medium leading-[15px] text-[#707783]">
          {date} <span className="px-1 text-slate-300">&bull;</span> {detail} <span className="px-1 text-slate-300">&bull;</span> {context}
        </p>
      </div>
      <button type="button" aria-label={`${title} menu`} className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
        <MoreHorizontalIcon className="size-4" />
      </button>
      <ChevronRightIcon className="size-4 shrink-0 text-slate-300" />
    </article>
  );
}

function UpcomingSessions({ sessions }: { sessions: SessionRecord[] }) {
  return (
    <aside className="h-fit w-full min-w-0 lg:sticky lg:top-6">
      <div className="w-full">
        <div className="flex w-full items-center justify-between">
          <h2 className="text-[18px] font-medium leading-[23px] text-slate-950">Upcoming Sessions</h2>
          <ArrowRightIcon className="size-5 text-slate-700" />
        </div>
        <p className="mt-[3px] text-[12px] font-medium leading-4 text-zinc-400">19 sessions remaining ahead</p>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </aside>
  );
}

function SessionCard({ session }: { session: SessionRecord }) {
  const statusTone = getStatusTone(session.status);

  return (
    <article className="flex min-h-[106px] items-center gap-3 rounded-[12px] border border-[#e5e7eb] bg-white px-[15px] py-[13px] shadow-[0_5px_15px_rgba(15,23,42,0.035)]">
      {session.avatar ? (
        <img src={session.avatar} alt="" className="size-10 shrink-0 rounded-full object-cover ring-2 ring-white" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 ring-2 ring-white">{getInitials(session.name)}</span>
      )}
      <div className="min-w-0 flex-1">
        <div>
          <h3 className="truncate text-[16px] font-semibold leading-5 text-slate-950">{session.name}</h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium leading-4 text-slate-500">
            <span className={cx("size-1.5 rounded-full", statusTone.dot)} />
            {session.status}
          </p>
        </div>
        <div className="mt-2.5 space-y-[5px]">
          <p className="flex items-center gap-1.5 text-[12px] font-medium leading-4 text-slate-500">
            <span className={cx("size-[7px] rounded-full", getNphiesDotTone(session.nphies))} />
            NPHIES: <span className={getNphiesTone(session.nphies)}>{session.nphies}</span>
          </p>
          {session.refId && <p className="text-[11px] font-medium leading-[15px] text-slate-500">Ref ID: {session.refId}</p>}
        </div>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-slate-300" />
    </article>
  );
}

function Modal({ title, subtitle, children, footer, onClose }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useMemo(() => `modal-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, [title]);

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const firstFocusable = getFocusableElements(modalRef.current)[0];
    firstFocusable?.focus();

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      previousActiveElement?.focus();
    };
  }, [onClose]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements(modalRef.current);
    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/28 px-4 py-6 backdrop-blur-[3px]" role="presentation">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className="max-h-[calc(100vh-48px)] w-full max-w-[560px] overflow-auto rounded-[14px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.2)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-extrabold text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="px-5 py-5">{children}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">{footer}</div>
      </div>
    </div>
  );
}

function FormInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  error,
  helperText,
  icon,
  max,
  autoComplete,
}: {
  id: keyof PatientDetails;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  max?: string;
  autoComplete?: string;
}) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-extrabold text-slate-800">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          max={max}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={cx(error ? errorId : null, helperText ? helperId : null) || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cx(
            "h-11 w-full rounded-[10px] border bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition placeholder:text-slate-400",
            icon ? "pr-10" : "",
            error ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-indigo-300",
          )}
        />
        {icon && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      </div>
      {helperText && (
        <p id={helperId} className="mt-1.5 text-xs font-medium text-slate-500">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-bold text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function SignatureCanvas({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasSignatureRef = useRef(Boolean(value));

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.25;
    context.strokeStyle = "#17203d";
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const getPosition = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  const beginDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const position = getPosition(event);
    context.beginPath();
    context.moveTo(position.x, position.y);
    isDrawingRef.current = true;
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    const context = canvasRef.current?.getContext("2d");
    if (!context || !isDrawingRef.current) {
      return;
    }

    event.preventDefault();
    const position = getPosition(event);
    context.lineTo(position.x, position.y);
    context.stroke();
    hasSignatureRef.current = true;
  };

  const stopDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;
    if (hasSignatureRef.current) {
      onChange(canvas.toDataURL("image/png"));
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    onChange("");
  };

  return (
    <section aria-label="Patient signature" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-slate-800">Patient Signature</h3>
        <button type="button" onClick={clearCanvas} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-2.5 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50">
          <EraserIcon className="size-3.5" />
          Clear
        </button>
      </div>

      <div className="relative min-h-[238px] overflow-hidden rounded-[12px] border border-dashed border-slate-300 bg-slate-50/45">
        {!value && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-slate-300">
            <SignatureIcon className="size-16" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          aria-label="Signature canvas"
          className="h-[238px] w-full touch-none"
          onPointerDown={beginDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
      {!value && <p className="text-xs font-semibold text-slate-500">Signature is required to continue.</p>}
    </section>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);
}

function getStatusTone(status: SessionStatus) {
  switch (status) {
    case "Active":
      return { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
    case "Upcoming":
      return { badge: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" };
    case "Pre-Auth Required":
      return { badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
    case "Auth Pending":
      return { badge: "bg-stone-100 text-stone-600", dot: "bg-stone-400" };
    case "Completed":
      return { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  }
}

function getNphiesTone(status: NphiesStatus) {
  switch (status) {
    case "Cleared":
    case "Verified":
      return "text-emerald-700";
    case "Queued":
      return "text-amber-700";
    case "Inactive":
      return "text-slate-500";
  }
}

function getNphiesDotTone(status: NphiesStatus) {
  switch (status) {
    case "Cleared":
    case "Verified":
      return "bg-emerald-500";
    case "Queued":
      return "bg-amber-500";
    case "Inactive":
      return "bg-slate-400";
  }
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M15 19a6 6 0 0 0-12 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m12 3 1.4 4.4L18 9l-4.6 1.6L12 15l-1.4-4.4L6 9l4.6-1.6L12 3ZM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14ZM5 13l.9 2.1L8 16l-2.1.9L5 19l-.9-2.1L2 16l2.1-.9L5 13Z" fill="currentColor" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10v6M12 7.5h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m7 13 5-5 5 5M12 8v10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function MoreHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6 12h.01M12 12h.01M18 12h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function EraserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m16 4 5 5-9 9H7l-4-4 9-9a3 3 0 0 1 4 0ZM7 18h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SignatureIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <path d="M16 50c10-18 15-18 16-8 2 18 12 2 15-8 3-11 8-10 9 0 1 12 6 15 12 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <path d="M14 61h52" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}
