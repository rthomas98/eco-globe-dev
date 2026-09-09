"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FlaskConical, RefreshCw, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { createSampleRequest, SAMPLE_QUANTITY_OPTIONS_LB } from "@/lib/api-samples";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import { LabTestingForm, type LabTestingListingContext } from "@/components/lab-testing/lab-testing-form";
import { LabTestingWorkspace } from "@/components/lab-testing/lab-testing-guidance";
import { makeIdempotencyKey } from "@/lib/lab-testing";

type Step =
  | { kind: "sample" }
  | { kind: "lab"; sampleId: number }
  | { kind: "sent"; sampleId: number; labRequested: boolean };

/**
 * "Request a Sample" modal ported from the live sample workflow, with the
 * lab testing line inside it: the sample the seller is already packing can
 * go to a laboratory too. The lab step reuses the shared referral form and
 * links the sample request it was placed from; it takes the full viewport
 * (form card plus guidance) while the sample form itself stays compact.
 */
export function RequestSampleModal({
  listing,
  onClose,
}: {
  listing: LabTestingListingContext;
  onClose: () => void;
}) {
  const baseId = useId();
  const [quantityLb, setQuantityLb] = useState<string>(String(SAMPLE_QUANTITY_OPTIONS_LB[0]));
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [labToo, setLabToo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [step, setStep] = useState<Step>({ kind: "sample" });
  const dialogRef = useRef<HTMLDivElement | null>(null);
  /** Reused on retry so an uncertain network result never creates two samples. */
  const idempotencyKey = useRef(makeIdempotencyKey());
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);
  const headingId = `${baseId}-heading`;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
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
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [onClose]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const sample = await createSampleRequest({
        listingId: listing.id,
        quantityLb: Number(quantityLb) || SAMPLE_QUANTITY_OPTIONS_LB[0],
        note: note.trim() || undefined,
        deliveryAddress: address.trim() || undefined,
        idempotencyKey: idempotencyKey.current,
      });
      setStep(labToo ? { kind: "lab", sampleId: sample.id } : { kind: "sent", sampleId: sample.id, labRequested: false });
    } catch (err: unknown) {
      setError({
        message: describeBackendError(err, "The sample request could not be sent."),
        retryable: isBackendApiError(err) ? err.retryable : true,
      });
    }
    setBusy(false);
  };

  if (step.kind === "lab") {
    const sampleId = step.sampleId;
    return (
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#F4F5F6]"
      >
        <LabTestingWorkspace
          actions={
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/40"
              style={{ border: "1px solid #E0E0E0" }}
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          }
        >
          <div className="flex flex-col gap-6">
            <p className="rounded-xl bg-emerald-50 px-5 py-4 text-[15px] leading-6 text-emerald-950" role="status">
              Sample request #{sampleId} sent to the seller. Now tell EcoGlobe what to test.
            </p>
            <LabTestingForm
              listing={listing}
              sampleRequestId={sampleId}
              headingId={headingId}
              autoFocus
              cancelLabel="Skip lab testing for now"
              onSubmitted={() => setStep({ kind: "sent", sampleId, labRequested: true })}
              onCancel={() => setStep({ kind: "sent", sampleId, labRequested: false })}
            />
          </div>
        </LabTestingWorkspace>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close sample request" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative z-10 flex max-h-dvh w-full flex-col overflow-y-auto bg-white p-5 sm:max-h-[90dvh] sm:max-w-[560px] sm:rounded-2xl sm:p-8"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/40" aria-label="Close">
          <X className="size-5" aria-hidden="true" />
        </button>

        {step.kind === "sent" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <h2 id={headingId} className="text-lg font-bold text-neutral-900">Sample requested</h2>
            <p className="max-w-[380px] text-sm text-neutral-600" role="status">
              The seller has been notified about sample request #{step.sampleId}. You&apos;ll get a notification when they respond.
              {step.labRequested ? " Your lab testing request is with EcoGlobe; the scope is confirmed with you before anything is booked." : ""}
            </p>
            {!step.labRequested && (
              <button type="button" onClick={() => setStep({ kind: "lab", sampleId: step.sampleId })} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 underline">
                <FlaskConical className="size-4" aria-hidden="true" /> Have this sample lab tested too
              </button>
            )}
            <Button variant="primary" size="md" onClick={onClose}>Done</Button>
          </div>
        )}

        {step.kind === "sample" && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
            <h2 id={headingId} className="flex items-center gap-2 text-xl font-bold text-neutral-900">
              <FlaskConical className="size-5" aria-hidden="true" /> Request a sample
            </h2>
            <p className="text-sm text-neutral-600">
              Order a small test batch of <span className="font-semibold text-neutral-900">{listing.title}</span> before committing to a bulk order. The seller reviews and ships samples directly.
            </p>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900" htmlFor={`${baseId}-qty`}>Sample size</label>
              <select ref={firstFieldRef} id={`${baseId}-qty`} value={quantityLb} onChange={(e) => setQuantityLb(e.target.value)} className="h-11 w-full rounded-lg bg-white px-3 text-sm text-neutral-900" style={{ border: "1px solid #E0E0E0" }}>
                {SAMPLE_QUANTITY_OPTIONS_LB.map((lb) => <option key={lb} value={lb}>{lb} lb</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900" htmlFor={`${baseId}-address`}>Ship to</label>
              <input id={`${baseId}-address`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, state, ZIP" className="h-11 w-full rounded-lg px-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20" style={{ border: "1px solid #E0E0E0" }} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900" htmlFor={`${baseId}-note`}>Note to seller <span className="font-normal text-neutral-400">(optional)</span></label>
              <textarea id={`${baseId}-note`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What will you be testing for?" className="w-full resize-none rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900/20" style={{ border: "1px solid #E0E0E0" }} />
            </div>

            <label htmlFor={`${baseId}-lab`} className="flex cursor-pointer items-start gap-3 rounded-xl bg-neutral-50 px-4 py-3">
              <input id={`${baseId}-lab`} type="checkbox" className="mt-1 size-4 accent-neutral-900" checked={labToo} onChange={(e) => setLabToo(e.target.checked)} />
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-neutral-900">Have this lab tested too?</span>
                <span className="text-xs text-neutral-600">EcoGlobe can arrange independent testing of this sample. You choose the scope and who sees the results; nothing is charged now.</span>
              </span>
            </label>

            {error && (
              <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
                <p>{error.message}</p>
                {error.retryable && (
                  <button type="button" onClick={() => void submit()} className="mt-1 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" aria-hidden="true" /> Retry</button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="secondary" size="md" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" disabled={busy} aria-busy={busy}>{busy ? "Sending..." : labToo ? "Send request, then choose tests" : "Send request"}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
