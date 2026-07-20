import type { GCCUpcomingSession } from "@/types/gcc-patient";

export const UPCOMING_SESSIONS_STORAGE_KEY = "medexa_gcc_upcoming_sessions_v2";
export const SELECTED_PATIENT_STORAGE_KEY = "medexa_gcc_selected_patient";
export const SELECTED_SESSION_ID_STORAGE_KEY = "medexa_gcc_selected_session_id";

export type GCCSelectedPatientSession = Pick<
  GCCUpcomingSession,
  | "id"
  | "patientName"
  | "initials"
  | "sessionType"
  | "sessionDate"
  | "sessionTime"
  | "status"
  | "nphiesStatus"
  | "referenceId"
> & { avatarUrl: string | null };

const LEGACY_CUSTOM_SESSIONS_STORAGE_KEY = "medexa_gcc_custom_upcoming_sessions";
const sessionStatuses: readonly GCCUpcomingSession["status"][] = [
  "Active",
  "Upcoming",
  "Pre-Auth Required",
  "Auth Pending",
  "Completed",
];
const nphiesStatuses: readonly GCCUpcomingSession["nphiesStatus"][] = [
  "Cleared",
  "Queued",
  "Pending",
  "Inactive",
  "Verified",
];

type StoredSessionsResult =
  | { status: "missing" }
  | { status: "corrupt" }
  | { status: "valid"; sessions: GCCUpcomingSession[]; wasSanitized: boolean };

export function validateUpcomingSession(value: unknown): value is GCCUpcomingSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Record<string, unknown>;

  return (
    typeof session.id === "string" &&
    session.id.length > 0 &&
    typeof session.patientName === "string" &&
    typeof session.initials === "string" &&
    (session.avatarUrl === undefined || typeof session.avatarUrl === "string") &&
    (session.dateOfBirth === undefined || typeof session.dateOfBirth === "string") &&
    (session.consentCapturedAt === undefined || typeof session.consentCapturedAt === "string") &&
    (session.consentMethod === undefined ||
      session.consentMethod === "drawn-signature" ||
      session.consentMethod === "typed-name") &&
    (session.consentSignerName === undefined || typeof session.consentSignerName === "string") &&
    typeof session.sessionType === "string" &&
    typeof session.sessionDate === "string" &&
    typeof session.sessionTime === "string" &&
    sessionStatuses.includes(session.status as GCCUpcomingSession["status"]) &&
    nphiesStatuses.includes(session.nphiesStatus as GCCUpcomingSession["nphiesStatus"]) &&
    typeof session.referenceId === "string" &&
    typeof session.createdAt === "string" &&
    session.createdAt.length > 0 &&
    (session.updatedAt === undefined || typeof session.updatedAt === "string")
  );
}

export function loadUpcomingSessions(
  defaultSessions: readonly GCCUpcomingSession[],
): GCCUpcomingSession[] {
  if (typeof window === "undefined") {
    return cloneSessions(defaultSessions);
  }

  return migrateUpcomingSessions(defaultSessions);
}

export function migrateUpcomingSessions(
  defaultSessions: readonly GCCUpcomingSession[],
): GCCUpcomingSession[] {
  const storage = getBrowserStorage();
  const defaults = deduplicateSessions(defaultSessions);

  if (!storage) {
    return defaults;
  }

  const storedSessions = readStoredSessions(storage, UPCOMING_SESSIONS_STORAGE_KEY);

  if (storedSessions.status === "valid") {
    if (storedSessions.wasSanitized) {
      writeStoredSessions(storage, storedSessions.sessions);
    }

    return storedSessions.sessions;
  }

  const defaultIds = new Set(defaults.map((session) => session.id));
  const legacySessions = readStoredSessions(storage, LEGACY_CUSTOM_SESSIONS_STORAGE_KEY);
  const customSessions =
    legacySessions.status === "valid"
      ? legacySessions.sessions.filter((session) => !defaultIds.has(session.id))
      : [];
  const migratedSessions = [...customSessions, ...defaults];

  if (storedSessions.status === "corrupt") {
    // Keep the unreadable canonical value intact for manual recovery. A future
    // explicit user mutation can replace it with the current validated snapshot.
    return migratedSessions;
  }

  if (writeStoredSessions(storage, migratedSessions)) {
    try {
      storage.removeItem(LEGACY_CUSTOM_SESSIONS_STORAGE_KEY);
    } catch {
      // The canonical snapshot is already saved; a stale legacy key is safe to ignore.
    }
  }

  return migratedSessions;
}

export function saveUpcomingSessions(sessions: readonly GCCUpcomingSession[]): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  return writeStoredSessions(storage, deduplicateSessions(sessions));
}

export function getSelectedUpcomingSessionId(): string | null {
  const storage = getBrowserStorage();
  if (!storage) return null;
  try {
    return storage.getItem(SELECTED_SESSION_ID_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function saveSelectedUpcomingSession(session: GCCUpcomingSession): boolean {
  const storage = getBrowserStorage();
  if (!storage) return false;
  const selected: GCCSelectedPatientSession = {
    id: session.id,
    patientName: session.patientName,
    initials: session.initials,
    avatarUrl: session.avatarUrl ?? null,
    sessionType: session.sessionType,
    sessionDate: session.sessionDate,
    sessionTime: session.sessionTime,
    status: session.status,
    nphiesStatus: session.nphiesStatus,
    referenceId: session.referenceId,
  };

  try {
    storage.setItem(SELECTED_PATIENT_STORAGE_KEY, JSON.stringify(selected));
    storage.setItem(SELECTED_SESSION_ID_STORAGE_KEY, session.id);
    return true;
  } catch {
    return false;
  }
}

export function loadSelectedUpcomingSession(patientId: string): GCCSelectedPatientSession | null {
  const storage = getBrowserStorage();
  if (!storage || !patientId) return null;

  try {
    const selectedValue = storage.getItem(SELECTED_PATIENT_STORAGE_KEY);
    if (selectedValue) {
      const selected: unknown = JSON.parse(selectedValue);
      if (validateSelectedSession(selected) && selected.id === patientId) {
        return { ...selected };
      }
    }

    const storedSessions = readStoredSessions(storage, UPCOMING_SESSIONS_STORAGE_KEY);
    if (storedSessions.status !== "valid") return null;
    const session = storedSessions.sessions.find((candidate) => candidate.id === patientId);
    return session
      ? {
          id: session.id,
          patientName: session.patientName,
          initials: session.initials,
          avatarUrl: session.avatarUrl ?? null,
          sessionType: session.sessionType,
          sessionDate: session.sessionDate,
          sessionTime: session.sessionTime,
          status: session.status,
          nphiesStatus: session.nphiesStatus,
          referenceId: session.referenceId,
        }
      : null;
  } catch {
    return null;
  }
}

function validateSelectedSession(value: unknown): value is GCCSelectedPatientSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.id === "string" && session.id.length > 0 &&
    typeof session.patientName === "string" &&
    typeof session.initials === "string" &&
    (session.avatarUrl === null || typeof session.avatarUrl === "string") &&
    typeof session.sessionType === "string" &&
    typeof session.sessionDate === "string" &&
    typeof session.sessionTime === "string" &&
    sessionStatuses.includes(session.status as GCCUpcomingSession["status"]) &&
    nphiesStatuses.includes(session.nphiesStatus as GCCUpcomingSession["nphiesStatus"]) &&
    typeof session.referenceId === "string"
  );
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredSessions(storage: Storage, key: string): StoredSessionsResult {
  try {
    const storedValue = storage.getItem(key);

    if (storedValue === null) {
      return { status: "missing" };
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return { status: "corrupt" };
    }

    const sessions: GCCUpcomingSession[] = [];
    const seenIds = new Set<string>();
    let wasSanitized = false;

    for (const value of parsedValue) {
      if (!validateUpcomingSession(value) || seenIds.has(value.id)) {
        wasSanitized = true;
        continue;
      }

      seenIds.add(value.id);
      sessions.push({ ...value });
    }

    return { status: "valid", sessions, wasSanitized };
  } catch {
    return { status: "corrupt" };
  }
}

function writeStoredSessions(storage: Storage, sessions: readonly GCCUpcomingSession[]): boolean {
  try {
    storage.setItem(UPCOMING_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch {
    return false;
  }
}

function cloneSessions(sessions: readonly GCCUpcomingSession[]): GCCUpcomingSession[] {
  return sessions.map((session) => ({ ...session }));
}

function deduplicateSessions(sessions: readonly GCCUpcomingSession[]): GCCUpcomingSession[] {
  const uniqueSessions: GCCUpcomingSession[] = [];
  const seenIds = new Set<string>();

  for (const session of sessions) {
    if (seenIds.has(session.id)) {
      continue;
    }

    seenIds.add(session.id);
    uniqueSessions.push({ ...session });
  }

  return uniqueSessions;
}
