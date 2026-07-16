"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

type Role = "buyer" | "seller";
type VerificationStatus = "Complete" | "In review" | "Needed";

interface VerificationStep {
  id: string;
  label: string;
  detail: string;
  status: VerificationStatus;
  requirements: string[];
}

interface SubmittedFile {
  name: string;
  size: number;
}

interface Notice {
  tone: "success" | "error";
  message: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg,.doc,.docx";
const ACCEPTED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "doc",
  "docx",
]);

const baseSteps: VerificationStep[] = [
  {
    id: "business",
    label: "Business verification",
    detail: "Company registration, tax ID, and authorized representative.",
    status: "Complete",
    requirements: [
      "A current company registration or formation document",
      "A valid tax identification document",
      "Authorized representative identification and signed authorization",
    ],
  },
  {
    id: "sustainability",
    label: "Sustainability documents",
    detail:
      "Certifications, COAs, SDS sheets, or ESG evidence tied to feedstocks.",
    status: "In review",
    requirements: [
      "Current sustainability certification or independent audit report",
      "A certificate of analysis or safety data sheet, where applicable",
      "ESG or carbon evidence tied to the feedstocks you trade",
    ],
  },
  {
    id: "financial",
    label: "Financial verification",
    detail:
      "Payment method, bank details, escrow eligibility, and payout readiness.",
    status: "Needed",
    requirements: [
      "Settlement account or payment-method verification",
      "A bank letter or statement confirming account ownership",
      "Escrow, billing, and finance contact details",
    ],
  },
  {
    id: "compliance",
    label: "Ongoing compliance",
    detail: "Expiration monitoring, renewal reminders, and admin spot checks.",
    status: "Needed",
    requirements: [
      "Documents showing visible issue and expiration dates",
      "A designated compliance contact for renewal reminders",
      "Any regulatory updates requested during an admin spot check",
    ],
  },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? ACCEPTED_EXTENSIONS.has(extension) : false;
}

export function VerificationCenter({ role }: { role: Role }) {
  const [steps, setSteps] = useState(baseSteps);
  const [submittedFiles, setSubmittedFiles] = useState<
    Record<string, SubmittedFile>
  >({});
  const [requirementsStep, setRequirementsStep] =
    useState<VerificationStep | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStepIdRef = useRef<string | null>(null);
  const requirementsTriggerRef = useRef<HTMLButtonElement | null>(null);

  const title = role === "buyer" ? "Buyer verification" : "Seller verification";
  const body =
    role === "buyer"
      ? "Complete buyer verification so orders, escrow funding, and delivery addresses can be approved."
      : "Complete seller verification so listings can be published and buyers can trust your documents.";

  const openFilePicker = (stepId: string) => {
    uploadStepIdRef.current = stepId;
    setNotice(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !uploadStepIdRef.current) return;

    const stepId = uploadStepIdRef.current;
    const step = steps.find((item) => item.id === stepId);
    uploadStepIdRef.current = null;

    if (!isAcceptedFile(file)) {
      setNotice({
        tone: "error",
        message:
          "Choose a PDF, PNG, JPG, DOC, or DOCX file to submit for verification.",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setNotice({
        tone: "error",
        message: "Choose a file smaller than 10 MB.",
      });
      return;
    }

    setSubmittedFiles((current) => ({
      ...current,
      [stepId]: { name: file.name, size: file.size },
    }));
    setSteps((current) =>
      current.map((item) =>
        item.id === stepId ? { ...item, status: "In review" } : item,
      ),
    );
    setNotice({
      tone: "success",
      message: `${file.name} is ready for admin review${step ? ` under ${step.label}` : ""}.`,
    });
  };

  const openRequirements = (
    step: VerificationStep,
    trigger: HTMLButtonElement,
  ) => {
    requirementsTriggerRef.current = trigger;
    setRequirementsStep(step);
  };

  const closeRequirements = () => {
    setRequirementsStep(null);
    window.setTimeout(() => requirementsTriggerRef.current?.focus(), 0);
  };

  const completeCount = steps.filter(
    (step) => step.status === "Complete",
  ).length;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        aria-label="Verification document upload"
        className="sr-only"
        onChange={handleFileSelected}
      />

      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 rounded-3xl bg-neutral-950 p-6 text-white sm:p-8">
          <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-300">
            VERIFICATION
          </p>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-300">{body}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width]"
              style={{ width: `${(completeCount / steps.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-300">
            {completeCount} of {steps.length} sections complete
          </p>
        </div>

        {notice && (
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mb-5 rounded-xl px-4 py-3 text-sm ring-1 ${
              notice.tone === "error"
                ? "bg-red-50 text-red-800 ring-red-100"
                : "bg-blue-50 text-blue-800 ring-blue-100"
            }`}
          >
            {notice.message}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {steps.map((step) => {
            const submittedFile = submittedFiles[step.id];

            return (
              <section
                key={step.id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                      {step.id === "business" ? (
                        <Building2 className="size-5 text-neutral-700" />
                      ) : step.id === "financial" ? (
                        <ShieldCheck className="size-5 text-neutral-700" />
                      ) : (
                        <FileText className="size-5 text-neutral-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-neutral-950">
                        {step.label}
                      </h2>
                      <p className="mt-1 text-sm text-neutral-600">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                  <VerificationBadge status={step.status} />
                </div>

                {submittedFile && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-blue-50 p-3 text-blue-900 ring-1 ring-blue-100">
                    <FileText className="size-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {submittedFile.name}
                      </p>
                      <p className="mt-0.5 text-xs text-blue-700">
                        {formatFileSize(submittedFile.size)} · Ready for admin
                        review
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-label={`${submittedFile ? "Replace document" : "Submit document"} for ${step.label}`}
                    onClick={() => openFilePicker(step.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/30 focus-visible:ring-offset-2"
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    {submittedFile ? "Replace document" : "Submit document"}
                  </button>
                  <button
                    type="button"
                    aria-label={`View requirements for ${step.label}`}
                    onClick={(event) =>
                      openRequirements(step, event.currentTarget)
                    }
                    className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/30 focus-visible:ring-offset-2"
                  >
                    View requirements
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {requirementsStep && (
        <RequirementsDialog
          step={requirementsStep}
          role={role}
          onClose={closeRequirements}
        />
      )}
    </div>
  );
}

function RequirementsDialog({
  step,
  role,
  onClose,
}: {
  step: VerificationStep;
  role: Role;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `requirements-${step.id}-title`;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    closeButtonRef.current?.focus();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl bg-white p-0 text-left shadow-2xl backdrop:bg-black/45"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {role} verification
            </p>
            <h2
              id={titleId}
              className="mt-2 text-2xl font-bold text-neutral-950"
            >
              {step.label} requirements
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close requirements"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/30"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-sm text-neutral-600">{step.detail}</p>

        <ul className="mt-6 space-y-3">
          {step.requirements.map((requirement) => (
            <li key={requirement} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <span className="text-sm leading-6 text-neutral-800">
                {requirement}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-700">
          <p className="font-semibold text-neutral-950">Accepted files</p>
          <p className="mt-1">PDF, PNG, JPG, DOC, or DOCX · Maximum 10 MB</p>
          <p className="mt-2 text-neutral-500">
            Admin review usually takes 1–2 business days after submission.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/30 focus-visible:ring-offset-2"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}

function VerificationBadge({ status }: { status: VerificationStatus }) {
  const tone = {
    Complete: "bg-emerald-100 text-emerald-700",
    "In review": "bg-blue-100 text-blue-700",
    Needed: "bg-amber-100 text-amber-800",
  }[status];
  const Icon = status === "Complete" ? CheckCircle2 : AlertTriangle;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {status}
    </span>
  );
}
