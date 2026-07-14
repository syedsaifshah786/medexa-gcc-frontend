"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from "react";
import type { GCCUpcomingSession } from "@/types/gcc-patient";

export type PatientModalMode = "create" | "edit";

type GCCAddPatientModalProps = {
  mode: PatientModalMode;
  isOpen: boolean;
  initialData: GCCUpcomingSession | null;
  onClose: () => void;
  onSubmit: (session: GCCUpcomingSession) => boolean;
};

const sessionTypes = [
  "Physical Therapy",
  "Occupational Therapy",
  "Speech Therapy",
  "Initial Assessment",
  "Follow-up Session",
  "Cardiac Rehabilitation",
] as const;

const createSessionStatuses: readonly GCCUpcomingSession["status"][] = [
  "Upcoming",
  "Active",
  "Pre-Auth Required",
  "Auth Pending",
];
const editSessionStatuses: readonly GCCUpcomingSession["status"][] = [
  ...createSessionStatuses,
  "Completed",
];
const nphiesStatuses: readonly GCCUpcomingSession["nphiesStatus"][] = [
  "Pending",
  "Cleared",
  "Queued",
  "Inactive",
  "Verified",
];

type FormValues = {
  patientName: string;
  sessionType: string;
  sessionDate: string;
  sessionTime: string;
  status: GCCUpcomingSession["status"];
  nphiesStatus: GCCUpcomingSession["nphiesStatus"];
  avatarUrl: string;
};

type RequiredField = "patientName" | "sessionType" | "sessionDate" | "sessionTime";
type FieldErrors = Partial<Record<RequiredField, string>>;

const initialValues: FormValues = {
  patientName: "",
  sessionType: "",
  sessionDate: "",
  sessionTime: "",
  status: "Upcoming",
  nphiesStatus: "Pending",
  avatarUrl: "",
};

export default function GCCAddPatientModal(props: GCCAddPatientModalProps) {
  if (!props.isOpen || (props.mode === "edit" && !props.initialData)) {
    return null;
  }

  const initialData = props.mode === "edit" ? props.initialData : null;
  const modalKey = `${props.mode}:${initialData?.id ?? "new"}`;

  return (
    <GCCPatientSessionModalContent
      key={modalKey}
      mode={props.mode}
      initialData={initialData}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
    />
  );
}

type GCCPatientSessionModalContentProps = Omit<GCCAddPatientModalProps, "isOpen">;

function GCCPatientSessionModalContent({
  mode,
  initialData,
  onClose,
  onSubmit,
}: GCCPatientSessionModalContentProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const patientNameRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const [values, setValues] = useState<FormValues>(() => getInitialValues(initialData));
  const [touched, setTouched] = useState<Partial<Record<RequiredField, boolean>>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationErrors = validateForm(values, initialData);
  const isFormValid = Object.keys(validationErrors).length === 0;
  const isEditMode = mode === "edit";
  const requiresSessionType = !isEditMode || Boolean(initialData?.sessionType);
  const requiresSessionDate = !isEditMode || Boolean(initialData?.sessionDate);
  const requiresSessionTime = !isEditMode || Boolean(initialData?.sessionTime);
  const title = isEditMode ? "Edit Upcoming Session" : "Add New Patient";
  const description = isEditMode
    ? "Update patient and session information"
    : "Create an upcoming patient session";
  const submitLabel = isEditMode ? "Save Changes" : "Add Patient";
  const submittingLabel = isEditMode ? "Saving Changes..." : "Adding Patient...";
  const sessionTypeOptions: readonly string[] =
    values.sessionType && !sessionTypes.some((sessionType) => sessionType === values.sessionType)
      ? [values.sessionType, ...sessionTypes]
      : sessionTypes;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    patientNameRef.current?.focus({ preventScroll: true });

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, []);

  const updateField = <Field extends keyof FormValues>(field: Field, value: FormValues[Field]) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
  };

  const markTouched = (field: RequiredField) => {
    setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
  };

  const visibleError = (field: RequiredField) =>
    hasAttemptedSubmit || touched[field] ? validationErrors[field] : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setTouched({ patientName: true, sessionType: true, sessionDate: true, sessionTime: true });

    const formErrors = validateForm(values, initialData);
    if (Object.keys(formErrors).length > 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const patientName = values.patientName.trim();
    const avatarUrl = values.avatarUrl.trim();
    const editableValues = {
      patientName,
      initials: getInitials(patientName),
      avatarUrl: avatarUrl || undefined,
      sessionType: values.sessionType,
      sessionDate: values.sessionDate,
      sessionTime: values.sessionTime,
      status: values.status,
      nphiesStatus: values.nphiesStatus,
    };

    const session: GCCUpcomingSession =
      isEditMode && initialData
        ? {
            ...initialData,
            ...editableValues,
          }
        : {
            id: globalThis.crypto.randomUUID(),
            ...editableValues,
            referenceId: generateReferenceId(),
            createdAt: new Date().toISOString(),
    };

    try {
      if (onSubmit(session)) {
        onClose();
      } else {
        setIsSubmitting(false);
      }
    } catch (error) {
      setIsSubmitting(false);
      throw error;
    }
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    const focusableElements = getFocusableElements(dialog);

    if (!dialog || focusableElements.length === 0) {
      event.preventDefault();
      dialog?.focus();
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (!dialog.contains(activeElement)) {
      event.preventDefault();
      (event.shiftKey ? lastFocusable : firstFocusable).focus();
    } else if (event.shiftKey && (activeElement === firstFocusable || activeElement === dialog)) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="presentation"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-[#050816]/45 px-4 py-6 backdrop-blur-[4px]"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="max-h-[calc(100vh-48px)] w-full max-w-[600px] overflow-y-auto rounded-[14px] border border-slate-200/90 bg-white shadow-[0_28px_90px_rgba(8,11,58,0.24)] outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[18px] font-extrabold leading-6 text-slate-950">
              {title}
            </h2>
            <p id={descriptionId} className="mt-1 text-[13px] font-medium leading-5 text-slate-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title} dialog`}
            className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <CloseIcon className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-5 py-5">
            <TextField
              id="patientName"
              inputRef={patientNameRef}
              label="Patient Name"
              value={values.patientName}
              placeholder="Enter patient full name"
              autoComplete="name"
              required
              error={visibleError("patientName")}
              onBlur={() => markTouched("patientName")}
              onChange={(value) => updateField("patientName", value)}
            />

            <SelectField
              id="sessionType"
              label="Session Type"
              value={values.sessionType}
              options={sessionTypeOptions}
              placeholder="Select session type"
              required={requiresSessionType}
              error={visibleError("sessionType")}
              onBlur={() => markTouched("sessionType")}
              onChange={(value) => updateField("sessionType", value)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="sessionDate"
                label="Session Date"
                type="date"
                value={values.sessionDate}
                required={requiresSessionDate}
                error={visibleError("sessionDate")}
                onBlur={() => markTouched("sessionDate")}
                onChange={(value) => updateField("sessionDate", value)}
              />
              <TextField
                id="sessionTime"
                label="Session Time"
                type="time"
                value={values.sessionTime}
                required={requiresSessionTime}
                error={visibleError("sessionTime")}
                onBlur={() => markTouched("sessionTime")}
                onChange={(value) => updateField("sessionTime", value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                id="status"
                label="Status"
                value={values.status}
                options={isEditMode ? editSessionStatuses : createSessionStatuses}
                onChange={(value) => updateField("status", value)}
              />
              <SelectField
                id="nphiesStatus"
                label="NPHIES Status"
                value={values.nphiesStatus}
                options={nphiesStatuses}
                onChange={(value) => updateField("nphiesStatus", value)}
              />
            </div>

            <TextField
              id="avatarUrl"
              label="Avatar URL"
              type="url"
              value={values.avatarUrl}
              placeholder="https://example.com/avatar.jpg"
              helperText="Optional. Initials will be generated when no avatar is provided."
              onChange={(value) => updateField("avatarUrl", value)}
            />
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-disabled={!isFormValid || isSubmitting}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-bold text-white transition ${
                !isFormValid || isSubmitting
                  ? "cursor-not-allowed bg-slate-300 shadow-none"
                  : "bg-[#080B3A] shadow-[0_10px_24px_rgba(8,11,58,0.2)] hover:bg-[#11165a]"
              }`}
            >
              <UserPlusIcon className="size-4" />
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function getInitialValues(initialData: GCCUpcomingSession | null): FormValues {
  if (!initialData) {
    return { ...initialValues };
  }

  return {
    patientName: initialData.patientName,
    sessionType: initialData.sessionType,
    sessionDate: initialData.sessionDate,
    sessionTime: initialData.sessionTime,
    status: initialData.status,
    nphiesStatus: initialData.nphiesStatus,
    avatarUrl: initialData.avatarUrl ?? "",
  };
}

function validateForm(values: FormValues, initialData: GCCUpcomingSession | null): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.patientName.trim()) {
    errors.patientName = "Patient name is required.";
  }

  if (!values.sessionType && (!initialData || Boolean(initialData.sessionType))) {
    errors.sessionType = "Session type is required.";
  }

  if (!values.sessionDate && (!initialData || Boolean(initialData.sessionDate))) {
    errors.sessionDate = "Session date is required.";
  }

  if (!values.sessionTime && (!initialData || Boolean(initialData.sessionTime))) {
    errors.sessionTime = "Session time is required.";
  }

  return errors;
}

function getInitials(patientName: string) {
  const nameParts = patientName.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.[0] ?? "";
  const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1]?.[0] ?? "" : "";

  return `${firstInitial}${lastInitial}`.toUpperCase();
}

function generateReferenceId() {
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return `PA-${new Date().getFullYear()}-${number}`;
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

function fieldClassName(hasError: boolean) {
  return [
    "h-11 w-full rounded-[10px] border bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition",
    hasError ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-indigo-300",
  ].join(" ");
}

function TextField({
  id,
  inputRef,
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  autoComplete,
  required = false,
  error,
  helperText,
}: {
  id: string;
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = [error ? errorId : "", helperText ? helperId : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-extrabold text-slate-800">
        {label}
        {required && (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 ${fieldClassName(Boolean(error))} placeholder:font-medium placeholder:text-slate-400`}
      />
      {helperText && (
        <p id={helperId} className="mt-1.5 text-xs font-medium text-slate-500">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-bold text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectField<Option extends string>({
  id,
  label,
  value,
  options,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
}: {
  id: string;
  label: string;
  value: Option | "";
  options: readonly Option[];
  onChange: (value: Option) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-extrabold text-slate-800">
        {label}
        {required && (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value as Option)}
        className={`mt-1.5 ${fieldClassName(Boolean(error))}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-bold text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M15 19a6 6 0 0 0-12 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
