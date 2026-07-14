export type GCCUpcomingSession = {
  id: string;
  patientName: string;
  initials: string;
  avatarUrl?: string;
  sessionType: string;
  sessionDate: string;
  sessionTime: string;
  status:
    | "Active"
    | "Upcoming"
    | "Pre-Auth Required"
    | "Auth Pending"
    | "Completed";
  nphiesStatus:
    | "Cleared"
    | "Queued"
    | "Pending"
    | "Inactive"
    | "Verified";
  referenceId: string;
  createdAt: string;
  updatedAt?: string;
};
