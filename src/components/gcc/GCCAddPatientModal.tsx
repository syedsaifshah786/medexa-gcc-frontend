"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
} from "react";
import { useGCCLocale } from "@/hooks/useGCCLocale";
import type { GCCLocaleContextValue } from "@/i18n/types";
import type { GCCUpcomingSession } from "@/types/gcc-patient";

export type PatientModalMode = "create" | "edit";

type GCCAddPatientModalProps = {
  mode: PatientModalMode;
  isOpen: boolean;
  initialData: GCCUpcomingSession | null;
  onClose: () => void;
  onSubmit: (session: GCCUpcomingSession) => boolean;
};

type PatientDetails = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  referenceId: string;
};

type PatientField = keyof PatientDetails;
type FieldErrors = Partial<Record<PatientField, string>>;
type ModalStep = "details" | "consent";
type Translator = GCCLocaleContextValue["t"];

const defaultDetails: PatientDetails = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  referenceId: "",
};

export default function GCCAddPatientModal(props: GCCAddPatientModalProps) {
  if (!props.isOpen || (props.mode === "edit" && !props.initialData)) {
    return null;
  }

  if (props.mode === "edit" && props.initialData) {
    return (
      <GCCEditSessionModalContent
        key={`edit:${props.initialData.id}`}
        initialData={props.initialData}
        onClose={props.onClose}
        onSubmit={props.onSubmit}
      />
    );
  }

  return (
    <GCCPatientModalContent
      key="create:new"
      mode="create"
      initialData={null}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
    />
  );
}

type GCCPatientModalContentProps = Omit<GCCAddPatientModalProps, "isOpen">;

function GCCPatientModalContent({
  mode,
  initialData,
  onClose,
  onSubmit,
}: GCCPatientModalContentProps) {
  const { t } = useGCCLocale();
  const existingPatient = initialData;
  const isEditMode = mode === "edit";
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const signatureDistanceRef = useRef(0);
  const lastSignaturePointRef = useRef<{ x: number; y: number } | null>(null);
  const onCloseRef = useRef(onClose);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const [step, setStep] = useState<ModalStep>("details");
  const [details, setDetails] = useState<PatientDetails>(() => getInitialDetails(existingPatient));
  const [touched, setTouched] = useState<Partial<Record<PatientField, boolean>>>({});
  const [hasAttemptedDetails, setHasAttemptedDetails] = useState(false);
  const [hasAttemptedConsent, setHasAttemptedConsent] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const validationErrors = validateDetails(details, isEditMode, t);
  const isConsentStep = step === "consent";
  const hasConsentSignature = hasSignature || typedSignature.trim().length >= 2;
  const title = isConsentStep
    ? t("ambient.patientModal.consentTitle")
    : isEditMode
      ? t("ambient.patientModal.editPatientTitle")
      : t("ambient.patientModal.addTitle");
  const description = isConsentStep
    ? t("ambient.patientModal.consentSubtitle")
    : t("ambient.patientModal.detailsSubtitle");

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

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

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      if (step === "details") {
        firstNameRef.current?.focus({ preventScroll: true });
        return;
      }

      const canvas = signatureCanvasRef.current;
      if (!canvas) {
        return;
      }

      prepareSignatureCanvas(canvas);
      dialogRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [step]);

  useEffect(() => {
    if (step !== "consent" || !signatureCanvasRef.current) {
      return;
    }

    const canvas = signatureCanvasRef.current;
    const resizeObserver = new ResizeObserver(() => prepareSignatureCanvas(canvas));
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, [step]);

  const updateField = (field: PatientField, value: string) => {
    setDetails((currentDetails) => ({ ...currentDetails, [field]: value }));
    setSubmissionError(null);
  };

  const markTouched = (field: PatientField) => {
    setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
  };

  const visibleError = (field: PatientField) =>
    hasAttemptedDetails || touched[field] ? validationErrors[field] : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step === "details") {
      setHasAttemptedDetails(true);
      setTouched({ firstName: true, lastName: true, dateOfBirth: true, referenceId: true });

      const errors = validateDetails(details, isEditMode, t);
      if (Object.keys(errors).length > 0) {
        focusFirstInvalidField(errors);
        return;
      }

      if (isEditMode) {
        completeSubmission();
        return;
      }

      setHasAttemptedConsent(false);
      setSubmissionError(null);
      setStep("consent");
      return;
    }

    setHasAttemptedConsent(true);
    if (!hasConsentSignature) {
      signatureCanvasRef.current?.focus({ preventScroll: true });
      return;
    }

    completeSubmission();
  };

  const completeSubmission = () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const now = new Date();
    const patientName = `${details.firstName.trim()} ${details.lastName.trim()}`;
    const session: GCCUpcomingSession = existingPatient
      ? {
          ...existingPatient,
          patientName,
          initials: getInitials(patientName),
          dateOfBirth: details.dateOfBirth || existingPatient.dateOfBirth,
          referenceId: details.referenceId.trim(),
        }
      : {
          id: createSessionId(),
          patientName,
          initials: getInitials(patientName),
          sessionType: "General Consultation",
          sessionDate: "",
          sessionTime: "",
          status: "Upcoming",
          nphiesStatus: "Pending",
          referenceId: details.referenceId.trim() || generateReferenceId(now),
          createdAt: now.toISOString(),
          dateOfBirth: details.dateOfBirth,
          consentCapturedAt: now.toISOString(),
          consentMethod: hasSignature ? "drawn-signature" : "typed-name",
          consentSignerName: typedSignature.trim() || patientName,
        };

    try {
      if (onSubmit(session)) {
        onClose();
        return;
      }

      setSubmissionError("ambient.patientModal.saveError");
    } catch {
      setSubmissionError("ambient.patientModal.saveError");
    } finally {
      setIsSubmitting(false);
    }
  };

  const focusFirstInvalidField = (errors: FieldErrors) => {
    const fieldOrder: PatientField[] = ["firstName", "lastName", "dateOfBirth", "referenceId"];
    const firstInvalidField = fieldOrder.find((field) => Boolean(errors[field]));
    document.getElementById(`${dialogId}-${firstInvalidField}`)?.focus({ preventScroll: true });
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x + 0.01, point.y + 0.01);
    context.stroke();
    isDrawingRef.current = true;
    signatureDistanceRef.current = 0;
    lastSignaturePointRef.current = point;
    setSubmissionError(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) {
      return;
    }

    event.preventDefault();
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    const previousPoint = lastSignaturePointRef.current;
    if (previousPoint) {
      signatureDistanceRef.current += Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
    }
    lastSignaturePointRef.current = point;
    context.lineTo(point.x, point.y);
    context.stroke();

    if (signatureDistanceRef.current >= 8) {
      setHasSignature(true);
      setHasAttemptedConsent(false);
    }
  };

  const finishDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
    lastSignaturePointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();
    }

    isDrawingRef.current = false;
    signatureDistanceRef.current = 0;
    lastSignaturePointRef.current = null;
    setHasSignature(false);
    setTypedSignature("");
    setHasAttemptedConsent(false);
    setSubmissionError(null);
    canvas?.focus({ preventScroll: true });
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
      className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-[#11142b]/35 px-4 py-6 backdrop-blur-[3px]"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="max-h-[calc(100vh-48px)] w-full max-w-[430px] overflow-y-auto rounded-[22px] border border-slate-200/90 bg-white shadow-[0_24px_70px_rgba(23,27,68,0.22)] outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-[15px]">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[18px] font-bold leading-6 text-[#6764ef]">
              {title}
            </h2>
            <p id={descriptionId} className="mt-1 text-[13px] font-medium leading-[19px] text-slate-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("ambient.patientModal.close", { title })}
            className="grid size-9 shrink-0 place-items-center rounded-full text-[#2e334f] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7774ff]"
          >
            <CloseIcon className="size-[18px]" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          {step === "details" ? (
            <div className="space-y-3 px-5 py-[26px]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  id={`${dialogId}-firstName`}
                  inputRef={firstNameRef}
                  label={t("ambient.patientModal.firstName")}
                  value={details.firstName}
                  placeholder={t("ambient.patientModal.firstName")}
                  autoComplete="given-name"
                  dir="auto"
                  required
                  error={visibleError("firstName")}
                  onBlur={() => markTouched("firstName")}
                  onChange={(value) => updateField("firstName", value)}
                />
                <TextField
                  id={`${dialogId}-lastName`}
                  label={t("ambient.patientModal.lastName")}
                  value={details.lastName}
                  placeholder={t("ambient.patientModal.lastName")}
                  autoComplete="family-name"
                  dir="auto"
                  required
                  error={visibleError("lastName")}
                  onBlur={() => markTouched("lastName")}
                  onChange={(value) => updateField("lastName", value)}
                />
              </div>

              <TextField
                id={`${dialogId}-dateOfBirth`}
                label={t("ambient.patientModal.dob")}
                type="date"
                value={details.dateOfBirth}
                max={getLocalDate(new Date())}
                autoComplete="bday"
                required={!isEditMode}
                error={visibleError("dateOfBirth")}
                onBlur={() => markTouched("dateOfBirth")}
                onChange={(value) => updateField("dateOfBirth", value)}
              />

              <ReferenceField
                id={`${dialogId}-referenceId`}
                value={details.referenceId}
                readOnly={false}
                error={visibleError("referenceId")}
                onBlur={() => markTouched("referenceId")}
                onChange={(value) => updateField("referenceId", value)}
              />
            </div>
          ) : (
            <div className="bg-slate-50/60 px-3 py-[14px]">
              <div
                className={`relative h-[238px] overflow-hidden rounded-[11px] border bg-white shadow-sm transition ${
                  hasAttemptedConsent && !hasConsentSignature ? "border-rose-300" : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={clearSignature}
                  className="absolute end-3 top-3 z-10 inline-flex h-8 items-center gap-1 rounded-lg bg-white/90 px-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7774ff]"
                >
                  <EraserIcon className="size-[18px] text-[#171b41]" />
                  {t("ambient.patientModal.clear")}
                </button>

                <div className="pointer-events-none absolute inset-0 grid place-items-center text-slate-100" aria-hidden="true">
                  <SignatureMarkIcon className="mb-2 size-14" />
                </div>

                <canvas
                  ref={signatureCanvasRef}
                  tabIndex={0}
                  role="img"
                  aria-label={t("ambient.patientModal.signatureDrawingAria")}
                  aria-describedby={`${dialogId}-signature-help${hasAttemptedConsent && !hasConsentSignature ? ` ${dialogId}-signature-error` : ""}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishDrawing}
                  onPointerCancel={finishDrawing}
                  className="relative size-full cursor-crosshair touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7774ff]"
                />
                <input
                  type="text"
                  value={typedSignature}
                  maxLength={100}
                  autoComplete="name"
                  aria-label={t("ambient.patientModal.signatureTypedAria")}
                  aria-describedby={`${dialogId}-signature-help${hasAttemptedConsent && !hasConsentSignature ? ` ${dialogId}-signature-error` : ""}`}
                  placeholder={t("ambient.patientModal.signaturePlaceholder")}
                  dir="auto"
                  onChange={(event) => {
                    setTypedSignature(event.target.value);
                    setHasAttemptedConsent(false);
                    setSubmissionError(null);
                  }}
                  className="absolute inset-x-[20%] bottom-[48px] z-10 h-9 w-[60%] border-0 border-b border-slate-200 bg-white/75 px-2 text-center text-[14px] font-medium text-[#11143f] outline-none placeholder:text-[11px] placeholder:text-slate-300 focus:border-[#7774ff]"
                />
              </div>
              <p id={`${dialogId}-signature-help`} className="sr-only">
                {t("ambient.patientModal.signatureHelp")}
              </p>
              {hasAttemptedConsent && !hasConsentSignature && (
                <p id={`${dialogId}-signature-error`} role="alert" className="mt-2 px-1 text-xs font-semibold text-rose-600">
                  {t("ambient.patientModal.signatureRequired")}
                </p>
              )}
            </div>
          )}

          <footer className="border-t border-slate-100 px-5 py-4">
            {submissionError && (
              <p role="alert" className="mb-3 text-center text-xs font-semibold text-rose-600">
                {t(submissionError)}
              </p>
            )}
            <div className="flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-full border border-[#c9cbe0] bg-[#f1f2ff] px-5 text-[15px] font-semibold text-[#15183d] shadow-[0_5px_12px_rgba(35,38,87,0.12)] transition hover:bg-[#e8e9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7774ff]"
              >
                <TrashIcon className="size-[18px]" />
                {t("ambient.patientModal.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-full bg-[#080a3a] px-6 text-[15px] font-semibold text-white shadow-[0_7px_16px_rgba(8,10,58,0.2)] transition hover:bg-[#151951] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7774ff] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                <CheckIcon className="size-[18px]" />
                {isSubmitting
                  ? t("ambient.patientModal.saving")
                  : isEditMode
                    ? t("ambient.patientModal.saveChanges")
                    : t("ambient.patientModal.saveAndContinue")}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

const editSessionTypes = [
  "Physical Therapy",
  "Occupational Therapy",
  "Speech Therapy",
  "Initial Assessment",
  "Follow-up Session",
  "Cardiac Rehabilitation",
] as const;

const editSessionStatuses: readonly GCCUpcomingSession["status"][] = [
  "Upcoming",
  "Active",
  "Pre-Auth Required",
  "Auth Pending",
  "Completed",
];

const editNphiesStatuses: readonly GCCUpcomingSession["nphiesStatus"][] = [
  "Pending",
  "Cleared",
  "Queued",
  "Inactive",
  "Verified",
];

const sessionTypeTranslationKeys: Readonly<Record<string, string>> = {
  "General Consultation": "ambient.sessionType.generalConsultation",
  "Physical Therapy": "ambient.sessionType.physicalTherapy",
  "Occupational Therapy": "ambient.sessionType.occupationalTherapy",
  "Speech Therapy": "ambient.sessionType.speechTherapy",
  "Initial Assessment": "ambient.sessionType.initialAssessment",
  "Follow-up Session": "ambient.sessionType.followUpSession",
  "Cardiac Rehabilitation": "ambient.sessionType.cardiacRehabilitation",
};

const statusTranslationKeys: Record<GCCUpcomingSession["status"], string> = {
  Active: "ambient.status.active",
  Upcoming: "ambient.status.upcoming",
  "Pre-Auth Required": "ambient.status.preAuthRequired",
  "Auth Pending": "ambient.status.authPending",
  Completed: "ambient.status.completed",
};

const nphiesTranslationKeys: Record<GCCUpcomingSession["nphiesStatus"], string> = {
  Pending: "ambient.nphies.pending",
  Cleared: "ambient.nphies.cleared",
  Queued: "ambient.nphies.queued",
  Inactive: "ambient.nphies.inactive",
  Verified: "ambient.nphies.verified",
};

type EditFormValues = {
  patientName: string;
  sessionType: string;
  sessionDate: string;
  sessionTime: string;
  status: GCCUpcomingSession["status"];
  nphiesStatus: GCCUpcomingSession["nphiesStatus"];
  avatarUrl: string;
};

type EditRequiredField = "patientName" | "sessionType" | "sessionDate" | "sessionTime";
type EditFieldErrors = Partial<Record<EditRequiredField, string>>;

function GCCEditSessionModalContent({
  initialData,
  onClose,
  onSubmit,
}: {
  initialData: GCCUpcomingSession;
  onClose: () => void;
  onSubmit: (session: GCCUpcomingSession) => boolean;
}) {
  const { t } = useGCCLocale();
  const dialogRef = useRef<HTMLDivElement>(null);
  const patientNameRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const [values, setValues] = useState<EditFormValues>(() => getEditInitialValues(initialData));
  const [touched, setTouched] = useState<Partial<Record<EditRequiredField, boolean>>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationErrors = validateEditForm(values, initialData, t);
  const isFormValid = Object.keys(validationErrors).length === 0;
  const sessionTypeOptions: readonly string[] =
    values.sessionType && !editSessionTypes.some((sessionType) => sessionType === values.sessionType)
      ? [values.sessionType, ...editSessionTypes]
      : editSessionTypes;

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

  const updateField = <Field extends keyof EditFormValues>(field: Field, value: EditFormValues[Field]) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
  };

  const markTouched = (field: EditRequiredField) => {
    setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
  };

  const visibleError = (field: EditRequiredField) =>
    hasAttemptedSubmit || touched[field] ? validationErrors[field] : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setTouched({ patientName: true, sessionType: true, sessionDate: true, sessionTime: true });

    const formErrors = validateEditForm(values, initialData, t);
    if (Object.keys(formErrors).length > 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const patientName = values.patientName.trim();
    const avatarUrl = values.avatarUrl.trim();
    const session: GCCUpcomingSession = {
      ...initialData,
      patientName,
      initials: getInitials(patientName),
      avatarUrl: avatarUrl || undefined,
      sessionType: values.sessionType,
      sessionDate: values.sessionDate,
      sessionTime: values.sessionTime,
      status: values.status,
      nphiesStatus: values.nphiesStatus,
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
              {t("ambient.patientModal.editTitle")}
            </h2>
            <p id={descriptionId} className="mt-1 text-[13px] font-medium leading-5 text-slate-500">
              {t("ambient.patientModal.editSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("ambient.patientModal.closeEdit")}
            className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <CloseIcon className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-5 py-5">
            <EditTextField
              id="patientName"
              inputRef={patientNameRef}
              label={t("ambient.patientModal.patientName")}
              value={values.patientName}
              placeholder={t("ambient.patientModal.patientNamePlaceholder")}
              autoComplete="name"
              dir="auto"
              required
              error={visibleError("patientName")}
              onBlur={() => markTouched("patientName")}
              onChange={(value) => updateField("patientName", value)}
            />

            <EditSelectField
              id="sessionType"
              label={t("ambient.patientModal.sessionType")}
              value={values.sessionType}
              options={sessionTypeOptions}
              placeholder={t("ambient.patientModal.selectSessionType")}
              getOptionLabel={(option) => {
                const translationKey = sessionTypeTranslationKeys[option];
                return translationKey ? t(translationKey) : option;
              }}
              required={Boolean(initialData.sessionType)}
              error={visibleError("sessionType")}
              onBlur={() => markTouched("sessionType")}
              onChange={(value) => updateField("sessionType", value)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditTextField
                id="sessionDate"
                label={t("ambient.patientModal.sessionDate")}
                type="date"
                value={values.sessionDate}
                required={Boolean(initialData.sessionDate)}
                error={visibleError("sessionDate")}
                onBlur={() => markTouched("sessionDate")}
                onChange={(value) => updateField("sessionDate", value)}
              />
              <EditTextField
                id="sessionTime"
                label={t("ambient.patientModal.sessionTime")}
                type="time"
                value={values.sessionTime}
                required={Boolean(initialData.sessionTime)}
                error={visibleError("sessionTime")}
                onBlur={() => markTouched("sessionTime")}
                onChange={(value) => updateField("sessionTime", value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditSelectField
                id="status"
                label={t("ambient.patientModal.status")}
                value={values.status}
                options={editSessionStatuses}
                getOptionLabel={(option) => t(statusTranslationKeys[option])}
                onChange={(value) => updateField("status", value)}
              />
              <EditSelectField
                id="nphiesStatus"
                label={t("ambient.patientModal.nphiesStatus")}
                value={values.nphiesStatus}
                options={editNphiesStatuses}
                getOptionLabel={(option) => t(nphiesTranslationKeys[option])}
                onChange={(value) => updateField("nphiesStatus", value)}
              />
            </div>

            <EditTextField
              id="avatarUrl"
              label={t("ambient.patientModal.avatarUrl")}
              type="url"
              value={values.avatarUrl}
              placeholder={t("ambient.patientModal.avatarPlaceholder")}
              helperText={t("ambient.patientModal.avatarHelp")}
              dir="ltr"
              onChange={(value) => updateField("avatarUrl", value)}
            />
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {t("ambient.patientModal.cancel")}
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
              {isSubmitting ? t("ambient.patientModal.savingChanges") : t("ambient.patientModal.saveChanges")}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function getEditInitialValues(initialData: GCCUpcomingSession): EditFormValues {
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

function validateEditForm(values: EditFormValues, initialData: GCCUpcomingSession, t: Translator): EditFieldErrors {
  const errors: EditFieldErrors = {};

  if (!values.patientName.trim()) {
    errors.patientName = t("ambient.patientModal.validation.patientNameRequired");
  }

  if (!values.sessionType && Boolean(initialData.sessionType)) {
    errors.sessionType = t("ambient.patientModal.validation.sessionTypeRequired");
  }

  if (!values.sessionDate && Boolean(initialData.sessionDate)) {
    errors.sessionDate = t("ambient.patientModal.validation.sessionDateRequired");
  }

  if (!values.sessionTime && Boolean(initialData.sessionTime)) {
    errors.sessionTime = t("ambient.patientModal.validation.sessionTimeRequired");
  }

  return errors;
}

function getInitialDetails(initialData: GCCUpcomingSession | null): PatientDetails {
  if (!initialData) {
    return { ...defaultDetails };
  }

  const nameParts = initialData.patientName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: nameParts[0] ?? "",
    lastName: nameParts.slice(1).join(" "),
    dateOfBirth: initialData.dateOfBirth ?? "",
    referenceId: initialData.referenceId,
  };
}

function validateDetails(details: PatientDetails, isEditMode: boolean, t: Translator): FieldErrors {
  const errors: FieldErrors = {};

  if (!details.firstName.trim()) {
    errors.firstName = t("ambient.patientModal.validation.firstNameRequired");
  }

  if (!details.lastName.trim()) {
    errors.lastName = t("ambient.patientModal.validation.lastNameRequired");
  }

  if (!details.dateOfBirth && !isEditMode) {
    errors.dateOfBirth = t("ambient.patientModal.validation.dobRequired");
  } else if (details.dateOfBirth && details.dateOfBirth > getLocalDate(new Date())) {
    errors.dateOfBirth = t("ambient.patientModal.validation.dobFuture");
  }

  return errors;
}

function getLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitials(patientName: string) {
  const nameParts = patientName.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.[0] ?? "";
  const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1]?.[0] ?? "" : "";

  return `${firstInitial}${lastInitial}`.toUpperCase();
}

function createSessionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `gcc-patient-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateReferenceId(now = new Date()) {
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return `PA-${now.getFullYear()}-${number}`;
}

function prepareSignatureCanvas(canvas: HTMLCanvasElement) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const nextWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
  const nextHeight = Math.max(1, Math.round(bounds.height * pixelRatio));

  if (canvas.width === nextWidth && canvas.height === nextHeight) {
    return;
  }

  const snapshot = document.createElement("canvas");
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  snapshot.getContext("2d")?.drawImage(canvas, 0, 0);

  canvas.width = nextWidth;
  canvas.height = nextHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.strokeStyle = "#11143f";
  context.lineWidth = 2.25;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (snapshot.width > 0 && snapshot.height > 0) {
    context.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, bounds.width, bounds.height);
  }
}

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: clientX - bounds.left,
    y: clientY - bounds.top,
  };
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), canvas[tabindex], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);
}

function editFieldClassName(hasError: boolean) {
  return [
    "h-11 w-full rounded-[10px] border bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition",
    hasError ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-indigo-300",
  ].join(" ");
}

function EditTextField({
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
  dir,
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
  dir?: "auto" | "ltr" | "rtl";
}) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = [error ? errorId : "", helperText ? helperId : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-extrabold text-slate-800">
        {label}
        {required && (
          <span className="ms-1 text-rose-500" aria-hidden="true">
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
        dir={dir}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 ${editFieldClassName(Boolean(error))} placeholder:font-medium placeholder:text-slate-400`}
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

function EditSelectField<Option extends string>({
  id,
  label,
  value,
  options,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  getOptionLabel = (option) => option,
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
  getOptionLabel?: (option: Option) => string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="relative">
      <label htmlFor={id} className="text-sm font-extrabold text-slate-800">
        {label}
        {required && (
          <span className="ms-1 text-rose-500" aria-hidden="true">
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
        className={`mt-1.5 ${editFieldClassName(Boolean(error))}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {getOptionLabel(option)}
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

function inputClassName(hasError: boolean) {
  return [
    "h-[45px] w-full rounded-[13px] border bg-white px-4 text-[14px] font-medium text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition outline-none",
    "placeholder:text-slate-400 focus:ring-2 focus:ring-[#7774ff]/15",
    hasError ? "border-rose-300 focus:border-rose-400" : "border-[#c9cbd7] focus:border-[#7774ff]",
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
  max,
  required = false,
  error,
  dir,
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
  max?: string;
  required?: boolean;
  error?: string;
  dir?: "auto" | "ltr" | "rtl";
}) {
  const errorId = `${id}-error`;

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={id}
        type={type}
        value={value}
        max={max}
        placeholder={placeholder}
        autoComplete={autoComplete}
        dir={dir}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClassName(Boolean(error))} ${
          type === "date"
            ? value
              ? "text-slate-800 [color-scheme:light] [&::-webkit-datetime-edit]:text-slate-800"
              : "text-transparent [color-scheme:light] [&::-webkit-datetime-edit]:text-transparent"
            : ""
        }`}
      />
      {type === "date" && !value && (
        <span className="pointer-events-none absolute start-4 top-[13px] text-[14px] font-medium text-slate-400" aria-hidden="true">
          {label}
        </span>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 px-1 text-xs font-semibold text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function ReferenceField({
  id,
  value,
  readOnly,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  value: string;
  readOnly: boolean;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const { t } = useGCCLocale();
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div>
      <div
        className={`rounded-[13px] border bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition focus-within:ring-2 focus-within:ring-[#7774ff]/15 ${
          error ? "border-rose-300 focus-within:border-rose-400" : "border-[#c9cbd7] focus-within:border-[#7774ff]"
        }`}
      >
        <label htmlFor={id} className="block text-[13px] font-medium leading-4 text-slate-400">
          {t("ambient.patientModal.referenceId")}
        </label>
        <input
          id={id}
          name={id}
          type="text"
          value={value}
          readOnly={readOnly}
          maxLength={64}
          autoComplete="off"
          dir="ltr"
          aria-invalid={Boolean(error)}
          aria-describedby={[error ? errorId : "", readOnly ? helperId : ""].filter(Boolean).join(" ") || undefined}
          placeholder={t("ambient.patientModal.referencePlaceholder")}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 h-5 w-full bg-transparent text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-300 read-only:cursor-not-allowed read-only:text-slate-500"
        />
      </div>
      {readOnly && (
        <p id={helperId} className="sr-only">
          {t("ambient.patientModal.referenceLocked")}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 px-1 text-xs font-semibold text-rose-600">
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}

function EraserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m4 15 7-9a2 2 0 0 1 3-.2l5 4.5a2 2 0 0 1 .2 2.8L13.5 19H8l-4-4Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m9.5 8 7 6.5M13.5 19H21" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SignatureMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M12 45c5-4 9-10 13-17 3-6 7-12 12-14 3-1 5 1 4 4-2 8-12 20-20 27-2 2-1 5 2 5 7 0 14-12 19-15 2-1 3 0 2 2l-5 8c-1 2 1 4 3 3l10-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
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
