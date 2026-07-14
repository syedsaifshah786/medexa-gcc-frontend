"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import GCCHeader from "@/components/gcc/GCCHeader";
import GCCPatientSessionModal from "@/components/gcc/GCCAddPatientModal";
import GCCDeleteSessionDialog from "@/components/gcc/GCCDeleteSessionDialog";
import { useGCCVoiceSession } from "@/hooks/useGCCVoiceSession";
import { loadUpcomingSessions, saveUpcomingSessions } from "@/lib/gcc/upcoming-session-storage";
import type { GCCUpcomingSession } from "@/types/gcc-patient";

/* eslint-disable @next/next/no-img-element -- Prototype dashboard uses static mocked patient avatars. */

const dashboardSessions: GCCUpcomingSession[] = [
  {
    id: "samuel-thompson",
    patientName: "Samuel Thompson",
    initials: "ST",
    avatarUrl: "https://i.pravatar.cc/96?img=12",
    sessionType: "",
    sessionDate: "",
    sessionTime: "",
    status: "Active",
    nphiesStatus: "Cleared",
    referenceId: "PA-2026-00847231",
    createdAt: "2026-07-13T00:00:00.000Z",
  },
  {
    id: "fatima-zahra-1",
    patientName: "Fatima Zahra",
    initials: "FZ",
    avatarUrl: "https://i.pravatar.cc/96?img=32",
    sessionType: "",
    sessionDate: "",
    sessionTime: "",
    status: "Upcoming",
    nphiesStatus: "Cleared",
    referenceId: "PA-2026-00847231",
    createdAt: "2026-07-13T00:00:00.000Z",
  },
  {
    id: "sarah-williams",
    patientName: "Sarah Williams",
    initials: "SW",
    avatarUrl: "https://i.pravatar.cc/96?img=47",
    sessionType: "",
    sessionDate: "",
    sessionTime: "",
    status: "Pre-Auth Required",
    nphiesStatus: "Queued",
    referenceId: "PA-2026-00847231",
    createdAt: "2026-07-13T00:00:00.000Z",
  },
  {
    id: "ahmed-abdullah",
    patientName: "Ahmed Abdullah",
    initials: "AA",
    avatarUrl: "https://i.pravatar.cc/96?img=13",
    sessionType: "",
    sessionDate: "",
    sessionTime: "",
    status: "Auth Pending",
    nphiesStatus: "Inactive",
    referenceId: "PA-2026-00847231",
    createdAt: "2026-07-13T00:00:00.000Z",
  },
  {
    id: "lina-chen",
    patientName: "Lina Chen",
    initials: "LC",
    avatarUrl: "https://i.pravatar.cc/96?img=29",
    sessionType: "",
    sessionDate: "",
    sessionTime: "",
    status: "Completed",
    nphiesStatus: "Verified",
    referenceId: "PA-2026-00937462",
    createdAt: "2026-07-13T00:00:00.000Z",
  },
  {
    id: "jameson-locke",
    patientName: "Jameson Locke",
    initials: "JL",
    avatarUrl: "https://i.pravatar.cc/96?img=14",
    sessionType: "",
    sessionDate: "",
    sessionTime: "",
    status: "Auth Pending",
    nphiesStatus: "Inactive",
    referenceId: "PA-2026-00847231",
    createdAt: "2026-07-13T00:00:00.000Z",
  },
  {
    id: "fatima-zahra-2",
    patientName: "Fatima Zahra",
    initials: "FZ",
    avatarUrl: "https://i.pravatar.cc/96?img=45",
    sessionType: "",
    sessionDate: "",
    sessionTime: "",
    status: "Upcoming",
    nphiesStatus: "Cleared",
    referenceId: "",
    createdAt: "2026-07-13T00:00:00.000Z",
  },
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

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");
const storageErrorMessage = "Unable to save upcoming sessions. Please try again.";

type DashboardToast = {
  message: string;
  tone: "success" | "error";
};

function formatSessionDateTime(sessionDate: string, sessionTime: string) {
  if (!sessionDate || !sessionTime) {
    return "";
  }

  const dateTime = new Date(`${sessionDate}T${sessionTime}`);
  if (Number.isNaN(dateTime.getTime())) {
    return "";
  }

  const date = dateTime.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = dateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return `${date} \u2022 ${time}`;
}

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
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GCCUpcomingSession | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<GCCUpcomingSession[]>(dashboardSessions);
  const [sessionToDelete, setSessionToDelete] = useState<GCCUpcomingSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<DashboardToast | null>(null);

  const currentDate = "Tuesday, Jul 13, 2026";

  useEffect(() => {
    // Browser storage is intentionally hydrated only after the server-rendered view mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUpcomingSessions(loadUpcomingSessions(dashboardSessions));
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (permissionStatus === "granted") {
      void startAmbientCommandListening();
    }
  }, [permissionStatus, startAmbientCommandListening]);

  const openAddPatient = useCallback(() => {
    setEditingSession(null);
    setIsPatientModalOpen(true);
  }, []);

  const openEditSession = useCallback((session: GCCUpcomingSession) => {
    setEditingSession(session);
    setIsPatientModalOpen(true);
  }, []);

  const closePatientModal = useCallback(() => {
    setIsPatientModalOpen(false);
    setEditingSession(null);
  }, []);

  const submitPatientSession = useCallback(
    (submittedSession: GCCUpcomingSession) => {
      if (editingSession) {
        const updatedAt = new Date().toISOString();
        const nextSessions = upcomingSessions.map((session) =>
          session.id === editingSession.id
            ? {
                ...session,
                ...submittedSession,
                id: session.id,
                referenceId: session.referenceId,
                createdAt: session.createdAt,
                updatedAt,
              }
            : session,
        );

        if (!saveUpcomingSessions(nextSessions)) {
          setToast({ message: storageErrorMessage, tone: "error" });
          return false;
        }

        setUpcomingSessions(nextSessions);
        setToast({ message: "Upcoming session updated successfully", tone: "success" });
        return true;
      }

      const nextSessions = [submittedSession, ...upcomingSessions.filter((session) => session.id !== submittedSession.id)];
      if (!saveUpcomingSessions(nextSessions)) {
        setToast({ message: storageErrorMessage, tone: "error" });
        return false;
      }

      setUpcomingSessions(nextSessions);
      setToast({ message: "Patient added to Upcoming Sessions", tone: "success" });
      return true;
    },
    [editingSession, upcomingSessions],
  );

  const requestDeleteSession = useCallback((session: GCCUpcomingSession) => {
    setSessionToDelete(session);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (!isDeleting) {
      setSessionToDelete(null);
    }
  }, [isDeleting]);

  const confirmDeleteSession = useCallback(async () => {
    if (!sessionToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

    const nextSessions = upcomingSessions.filter((session) => session.id !== sessionToDelete.id);
    if (!saveUpcomingSessions(nextSessions)) {
      setIsDeleting(false);
      setToast({ message: storageErrorMessage, tone: "error" });
      return;
    }

    setUpcomingSessions(nextSessions);
    setSessionToDelete(null);
    setIsDeleting(false);
    setToast({ message: "Upcoming session deleted", tone: "success" });
  }, [isDeleting, sessionToDelete, upcomingSessions]);

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
            <DashboardActionButtons onAddPatient={openAddPatient} onStartSession={startNewSession} className="mt-4 lg:hidden" />
            <NewSessionCallout onStartSession={startNewSession} />
            <OperationalHealth />
            <DueActionItems />
          </div>

          <div className="w-full min-w-0">
            <DashboardActionButtons onAddPatient={openAddPatient} onStartSession={startNewSession} className="mb-6 hidden lg:flex lg:justify-end" />
            <UpcomingSessions sessions={upcomingSessions} onEdit={openEditSession} onDelete={requestDeleteSession} />
          </div>
        </div>

        <GCCPatientSessionModal
          mode={editingSession ? "edit" : "create"}
          isOpen={isPatientModalOpen}
          initialData={editingSession}
          onClose={closePatientModal}
          onSubmit={submitPatientSession}
        />

        <GCCDeleteSessionDialog
          session={sessionToDelete}
          isDeleting={isDeleting}
          onClose={closeDeleteDialog}
          onConfirm={() => void confirmDeleteSession()}
        />

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={cx(
              "fixed bottom-5 right-5 z-[150] rounded-[12px] border px-4 py-3 text-sm font-bold shadow-[0_18px_45px_rgba(15,23,42,0.14)]",
              toast.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700",
            )}
          >
            {toast.message}
          </div>
        )}
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

function UpcomingSessions({
  sessions,
  onEdit,
  onDelete,
}: {
  sessions: GCCUpcomingSession[];
  onEdit: (session: GCCUpcomingSession) => void;
  onDelete: (session: GCCUpcomingSession) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  return (
    <aside className="h-fit w-full min-w-0 lg:sticky lg:top-6">
      <div className="w-full">
        <div className="flex w-full items-center justify-between">
          <h2 id="gcc-upcoming-sessions-heading" tabIndex={-1} className="text-[18px] font-medium leading-[23px] text-slate-950">
            Upcoming Sessions
          </h2>
          <ArrowRightIcon className="size-5 text-slate-700" />
        </div>
        <p className="mt-[3px] text-[12px] font-medium leading-4 text-zinc-400">19 sessions remaining ahead</p>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isMenuOpen={openMenuId === session.id}
            onToggleMenu={() => setOpenMenuId((currentId) => (currentId === session.id ? null : session.id))}
            onCloseMenu={closeMenu}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </aside>
  );
}

function SessionCard({
  session,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onDelete,
}: {
  session: GCCUpcomingSession;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onEdit: (session: GCCUpcomingSession) => void;
  onDelete: (session: GCCUpcomingSession) => void;
}) {
  const statusTone = getStatusTone(session.status);
  const sessionDateTime = formatSessionDateTime(session.sessionDate, session.sessionTime);
  const menuId = useId();
  const triggerId = `${menuId}-trigger`;
  const actionsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusLastItemRef = useRef(false);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const menuItems = getMenuItems(menuRef.current);
      const target = focusLastItemRef.current ? menuItems[menuItems.length - 1] : menuItems[0];
      target?.focus();
      focusLastItemRef.current = false;
    });

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !actionsRef.current?.contains(target)) {
        onCloseMenu();
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen, onCloseMenu]);

  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    focusLastItemRef.current = false;
    onToggleMenu();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    focusLastItemRef.current = event.key === "ArrowUp";
    if (!isMenuOpen) {
      onToggleMenu();
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const menuItems = getMenuItems(menuRef.current);
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = currentIndex < 0 ? menuItems.length - 1 : (currentIndex - 1 + menuItems.length) % menuItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = menuItems.length - 1;
    }

    if (nextIndex !== null && menuItems[nextIndex]) {
      event.preventDefault();
      menuItems[nextIndex].focus();
    }
  };

  const handleEdit = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    triggerRef.current?.focus();
    onCloseMenu();
    onEdit(session);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    triggerRef.current?.focus();
    onCloseMenu();
    onDelete(session);
  };

  return (
    <article className="relative flex min-h-[106px] items-center gap-3 rounded-[12px] border border-[#e5e7eb] bg-white px-[15px] py-[13px] shadow-[0_5px_15px_rgba(15,23,42,0.035)]">
      {session.avatarUrl ? (
        <img src={session.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover ring-2 ring-white" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 ring-2 ring-white">{session.initials}</span>
      )}
      <div className="min-w-0 flex-1 pr-7">
        <div>
          <h3 className="truncate text-[16px] font-semibold leading-5 text-slate-950">{session.patientName}</h3>
          <p className="mt-1 flex min-w-0 items-center gap-x-1.5 overflow-hidden text-[12px] font-medium leading-4 text-slate-500">
            <span className={cx("size-1.5 shrink-0 rounded-full", statusTone.dot)} />
            <span className="shrink-0">{session.status}</span>
            {sessionDateTime && (
              <>
                <span className="shrink-0 text-slate-300" aria-hidden="true">
                  &bull;
                </span>
                <span className="truncate whitespace-nowrap text-[11px] text-slate-400">{sessionDateTime}</span>
              </>
            )}
          </p>
        </div>
        <div className="mt-2.5 space-y-[5px]">
          <p className="flex items-center gap-1.5 text-[12px] font-medium leading-4 text-slate-500">
            <span className={cx("size-[7px] rounded-full", getNphiesDotTone(session.nphiesStatus))} />
            NPHIES: <span className={getNphiesTone(session.nphiesStatus)}>{session.nphiesStatus}</span>
          </p>
          {session.referenceId && <p className="text-[11px] font-medium leading-[15px] text-slate-500">Ref ID: {session.referenceId}</p>}
        </div>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-slate-300" />

      <div
        ref={actionsRef}
        className="absolute right-8 top-2.5 z-[70]"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            onCloseMenu();
          }
        }}
      >
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          aria-label={`Actions for ${session.patientName}`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-controls={isMenuOpen ? menuId : undefined}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
          className="grid size-7 place-items-center rounded-full bg-white/90 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
        >
          <EllipsisVerticalIcon className="size-4" />
        </button>

        {isMenuOpen && (
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            onKeyDown={handleMenuKeyDown}
            className="absolute right-0 top-[calc(100%+6px)] z-[80] w-44 overflow-hidden rounded-[11px] border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleEdit}
              className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] font-semibold text-[#080B3A] transition hover:bg-slate-50"
            >
              <PencilIcon className="size-4" />
              Edit Session
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleDelete}
              className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <TrashIcon className="size-4" />
              Delete Session
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function getMenuItems(menu: HTMLDivElement | null) {
  if (!menu) {
    return [];
  }

  return Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
}

function getStatusTone(status: GCCUpcomingSession["status"]) {
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

function getNphiesTone(status: GCCUpcomingSession["nphiesStatus"]) {
  switch (status) {
    case "Cleared":
    case "Verified":
      return "text-emerald-700";
    case "Queued":
      return "text-amber-700";
    case "Pending":
      return "text-indigo-600";
    case "Inactive":
      return "text-slate-500";
  }
}

function getNphiesDotTone(status: GCCUpcomingSession["nphiesStatus"]) {
  switch (status) {
    case "Cleared":
    case "Verified":
      return "bg-emerald-500";
    case "Queued":
      return "bg-amber-500";
    case "Pending":
      return "bg-indigo-400";
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

function EllipsisVerticalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 6h.01M12 12h.01M12 18h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.8" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m4 20 4.25-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.25 16 4 20Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m14.75 6.5 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
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
