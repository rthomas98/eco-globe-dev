"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import type { MarketReviewField, MarketReviewStatus } from "@/lib/api-market-records";
import { FIELD_STATUS_LABELS } from "@/lib/market-record-format";

const FIELD_LABELS: Record<MarketReviewField, string> = {
  address: "address",
  price: "research price",
  volume: "volume",
};

/**
 * Independent field review. The server records the acting admin and date;
 * nothing here is client-stamped. Cancelling never writes anything.
 */
export function MarketRecordReviewDialog({
  field,
  currentStatus,
  currentCitation,
  valuePresent,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  field: MarketReviewField;
  currentStatus: MarketReviewStatus;
  currentCitation: string | null;
  valuePresent: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: (input: { status: MarketReviewStatus; citation: string | null; reason: string }) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const statusId = useId();
  const citationId = useId();
  const reasonId = useId();
  const problemId = useId();
  const [status, setStatus] = useState<MarketReviewStatus>(currentStatus);
  const [citation, setCitation] = useState(currentCitation ?? "");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const problem =
    reason.trim() === ""
      ? "Enter a reason so the record history explains this review."
      : status !== "unknown" && citation.trim() === ""
      ? "Enter the citation that supports this review."
      : status === "confirmed" && !valuePresent
        ? field === "address"
          ? "An address needs street, city, postal code and country before it can be confirmed."
          : field === "price"
            ? "A price needs a value, currency and per-unit before it can be confirmed."
            : "A volume needs a value and unit before it can be confirmed."
        : null;

  const close = () => {
    if (!busy) onClose();
  };
  const inputClass =
    "w-full rounded-lg bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20";
  const border = { border: "1px solid #E0E0E0" };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="m-auto w-[min(92vw,520px)] rounded-2xl bg-white p-6 text-neutral-950 shadow-xl backdrop:bg-black/40"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (problem || busy) return;
          onConfirm({ status, citation: citation.trim() || null, reason: reason.trim() });
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold">
            Review {FIELD_LABELS[field]}
          </h2>
          <button type="button" onClick={close} aria-label="Close dialog" disabled={busy}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mb-4 text-sm text-neutral-600">
          Your name and today&apos;s date are recorded as the reviewer. The source check claim does not change.
        </p>
        <label htmlFor={statusId} className="mb-1.5 block text-sm font-medium text-neutral-900">
          Status
        </label>
        <select
          id={statusId}
          disabled={busy}
          value={status}
          onChange={(event) => setStatus(event.target.value as MarketReviewStatus)}
          className={inputClass}
          style={border}
        >
          {(Object.keys(FIELD_STATUS_LABELS) as MarketReviewStatus[]).map((value) => (
            <option key={value} value={value}>
              {FIELD_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <label htmlFor={citationId} className="mb-1.5 mt-4 block text-sm font-medium text-neutral-900">
          Citation{status === "unknown" ? " (optional)" : " (required)"}
        </label>
        <textarea
          id={citationId}
          disabled={busy}
          value={citation}
          onChange={(event) => setCitation(event.target.value)}
          rows={2}
          maxLength={2000}
          aria-invalid={touched && status !== "unknown" && citation.trim() === "" ? true : undefined}
          aria-describedby={touched && problem ? problemId : undefined}
          className={inputClass}
          style={border}
        />
        <label htmlFor={reasonId} className="mb-1.5 mt-4 block text-sm font-medium text-neutral-900">
          Reason (required)
        </label>
        <textarea
          id={reasonId}
          required
          disabled={busy}
          aria-invalid={touched && reason.trim() === "" ? true : undefined}
          aria-describedby={touched && problem ? problemId : undefined}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          maxLength={1000}
          className={inputClass}
          style={border}
        />
        {touched && problem && (
          <p id={problemId} className="mt-2 text-sm text-red-700">
            {problem}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={close} disabled={busy} style={border}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy} aria-busy={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? "Saving…" : "Save review"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
