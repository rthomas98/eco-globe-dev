"use client";

import { useId, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import { fetchMarketRecord, marketRecordErrorDetails } from "@/lib/api-market-records";
import { uploadMarketReference, type MarketReference } from "@/lib/api-market-references";
import {
  MAX_REFERENCE_BYTES,
  REFERENCE_LIMITS,
  formatReferenceSize,
  parseReferenceRecordIds,
  referenceFileProblem,
} from "@/lib/market-reference-format";

const border = { border: "1px solid #E0E0E0" };
const inputClass =
  "w-full rounded-lg bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20 disabled:bg-neutral-100 disabled:text-neutral-500";

type Field = "file" | "title" | "material" | "notes" | "recordIds" | "reason";
type Errors = Partial<Record<Field, string>>;

/** Server field names → form fields (`contentBase64`/`fileName` both describe the chosen file). */
const SERVER_FIELDS: Record<string, Field> = {
  contentBase64: "file",
  fileName: "file",
  title: "title",
  material: "material",
  notes: "notes",
  recordIds: "recordIds",
  reason: "reason",
};

/**
 * Checks each optional record ID against the internal registry before upload,
 * so a typo is caught with the record number rather than a generic failure.
 * The server repeats this check inside the upload transaction.
 */
async function findMissingRecords(ids: number[]) {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        await fetchMarketRecord(id);
        return null;
      } catch (error) {
        if (isBackendApiError(error) && error.status === 404) return id;
        throw error;
      }
    }),
  );
  return results.filter((id): id is number => id !== null);
}

export function MarketReferenceUploadForm({
  onCreated,
  onDuplicate,
}: {
  onCreated: (reference: MarketReference) => void;
  onDuplicate: (existingId: number) => void;
}) {
  const ids = {
    file: useId(),
    title: useId(),
    material: useId(),
    notes: useId(),
    recordIds: useId(),
    reason: useId(),
  };
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [material, setMaterial] = useState("");
  const [notes, setNotes] = useState("");
  const [recordIdsText, setRecordIdsText] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<React.ReactNode>(null);
  const [saving, setSaving] = useState(false);

  const validate = (): { errors: Errors; recordIds: number[] } => {
    const next: Errors = {};
    if (!file) next.file = "Choose the original PDF.";
    else {
      const problem = referenceFileProblem(file);
      if (problem) next.file = problem;
    }
    if (!title.trim()) next.title = "Enter a descriptive title.";
    if (!material.trim()) next.material = "Enter the material this document describes.";
    if (!reason.trim()) next.reason = "Enter why this reference is being added.";
    const parsed = parseReferenceRecordIds(recordIdsText);
    if (parsed.error) next.recordIds = parsed.error;
    return { errors: next, recordIds: parsed.ids };
  };

  const submit = async () => {
    if (saving) return;
    setFormError(null);
    const checked = validate();
    setErrors(checked.errors);
    if (Object.keys(checked.errors).length > 0 || !file) {
      setFormError("Fix the highlighted fields. Nothing was uploaded.");
      return;
    }
    setSaving(true);
    // Only a failure after the upload request starts can leave an unknown outcome.
    let uploadStarted = false;
    try {
      if (checked.recordIds.length > 0) {
        const missing = await findMissingRecords(checked.recordIds);
        if (missing.length > 0) {
          setErrors({
            recordIds: `No internal market record has ID ${missing.map((id) => `#${id}`).join(", ")}.`,
          });
          setFormError("Fix the highlighted fields. Nothing was uploaded.");
          return;
        }
      }
      uploadStarted = true;
      const reference = await uploadMarketReference(file, {
        title: title.trim(),
        material: material.trim(),
        notes: notes.trim() || null,
        recordIds: checked.recordIds,
        reason: reason.trim(),
      });
      onCreated(reference);
    } catch (caught) {
      const details = marketRecordErrorDetails(caught);
      if (details.status === 409 && details.code === "duplicate_reference") {
        setFormError(
          <>
            Nothing was added. This exact PDF is already in the library
            {details.existingId !== null ? ` as reference #${details.existingId}` : ""}.{" "}
            {details.existingId !== null && (
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => onDuplicate(details.existingId!)}
              >
                Show the existing reference
              </button>
            )}
          </>,
        );
        return;
      }
      const fieldErrors: Errors = {};
      for (const [key, message] of Object.entries(details.fieldErrors)) {
        const field = SERVER_FIELDS[key];
        if (field) fieldErrors[field] = message;
      }
      setErrors(fieldErrors);
      if (!uploadStarted) {
        setFormError(
          `The linked record IDs could not be checked. ${describeBackendError(caught, "Please try again.")} Nothing was uploaded.`,
        );
      } else if (isBackendApiError(caught) && (caught.kind === "timeout" || caught.kind === "network")) {
        setFormError(
          `${caught.kind === "timeout" ? "The upload did not finish in time." : "The connection to EcoGlobe was lost during the upload."} It may or may not have been saved. Reload the library to check before retrying; uploading the same PDF again is reported as a duplicate, never added twice.`,
        );
      } else {
        setFormError(
          `${describeBackendError(caught, "The reference could not be uploaded.")} Nothing was added; your entries are still in the form.`,
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const describedBy = (field: Field, hint?: string) =>
    [hint, errors[field] ? `${ids[field]}-error` : undefined].filter(Boolean).join(" ") || undefined;
  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`${ids[field]}-error`} className="mt-1 text-xs text-red-700">
        {errors[field]}
      </p>
    ) : null;
  const labelClass = "mb-1 block text-sm font-medium text-neutral-800";

  return (
    <section aria-labelledby={`${ids.file}-heading`} className="rounded-2xl bg-white p-4 sm:p-6" style={border}>
      <h2 id={`${ids.file}-heading`} className="text-base font-bold text-neutral-900">
        Add a reference PDF
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        One original PDF per upload, up to {formatReferenceSize(MAX_REFERENCE_BYTES)}. The file is stored exactly as
        chosen and cannot be replaced or deleted from here.
      </p>
      <form
        noValidate
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset disabled={saving} aria-busy={saving} className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <legend className="sr-only">Reference details</legend>
          <div className="min-w-0 md:col-span-2">
            <label htmlFor={ids.file} className={labelClass}>
              Original PDF <span aria-hidden="true">*</span>
            </label>
            <input
              id={ids.file}
              type="file"
              accept="application/pdf,.pdf"
              required
              aria-invalid={Boolean(errors.file)}
              aria-describedby={describedBy("file")}
              onChange={(event) => {
                const chosen = event.target.files?.[0] ?? null;
                setFile(chosen);
                setErrors((prev) => ({ ...prev, file: chosen ? referenceFileProblem(chosen) ?? undefined : undefined }));
              }}
              className="block w-full min-w-0 text-sm text-neutral-800 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
            />
            {file && !errors.file && (
              <p className="mt-1 break-all text-xs text-neutral-600">
                {file.name} · {formatReferenceSize(file.size)}
              </p>
            )}
            {fieldError("file")}
          </div>
          <div className="min-w-0">
            <label htmlFor={ids.title} className={labelClass}>
              Title <span aria-hidden="true">*</span>
            </label>
            <input
              id={ids.title}
              value={title}
              maxLength={REFERENCE_LIMITS.title}
              required
              aria-invalid={Boolean(errors.title)}
              aria-describedby={describedBy("title")}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              style={border}
            />
            {fieldError("title")}
          </div>
          <div className="min-w-0">
            <label htmlFor={ids.material} className={labelClass}>
              Material <span aria-hidden="true">*</span>
            </label>
            <input
              id={ids.material}
              value={material}
              maxLength={REFERENCE_LIMITS.material}
              required
              aria-invalid={Boolean(errors.material)}
              aria-describedby={describedBy("material")}
              onChange={(event) => setMaterial(event.target.value)}
              className={inputClass}
              style={border}
            />
            {fieldError("material")}
          </div>
          <div className="min-w-0 md:col-span-2">
            <label htmlFor={ids.notes} className={labelClass}>
              Notes <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <textarea
              id={ids.notes}
              value={notes}
              rows={3}
              maxLength={REFERENCE_LIMITS.notes}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={describedBy("notes")}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClass}
              style={border}
            />
            {fieldError("notes")}
          </div>
          <div className="min-w-0">
            <label htmlFor={ids.recordIds} className={labelClass}>
              Link to market record IDs <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id={ids.recordIds}
              value={recordIdsText}
              inputMode="numeric"
              placeholder="e.g. 12, 40"
              aria-invalid={Boolean(errors.recordIds)}
              aria-describedby={describedBy("recordIds", `${ids.recordIds}-hint`)}
              onChange={(event) => setRecordIdsText(event.target.value)}
              className={inputClass}
              style={border}
            />
            <p id={`${ids.recordIds}-hint`} className="mt-1 text-xs text-neutral-500">
              Existing internal records only. Leave empty to keep the PDF unlinked.
            </p>
            {fieldError("recordIds")}
          </div>
          <div className="min-w-0">
            <label htmlFor={ids.reason} className={labelClass}>
              Reason <span aria-hidden="true">*</span>
            </label>
            <input
              id={ids.reason}
              value={reason}
              maxLength={REFERENCE_LIMITS.reason}
              required
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={describedBy("reason", `${ids.reason}-hint`)}
              onChange={(event) => setReason(event.target.value)}
              className={inputClass}
              style={border}
            />
            <p id={`${ids.reason}-hint`} className="mt-1 text-xs text-neutral-500">
              Recorded in the audit log.
            </p>
            {fieldError("reason")}
          </div>
          {formError && (
            <p role="alert" className="text-sm text-red-700 md:col-span-2">
              {formError}
            </p>
          )}
          <div className="md:col-span-2">
            <Button type="submit" size="sm" aria-busy={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {saving ? "Uploading…" : "Upload reference"}
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
