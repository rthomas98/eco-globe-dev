"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@eco-globe/ui";

/**
 * Native modal dialog (focus trap, Escape and focus return come from the
 * browser) that collects a reason before an archive or restore. Cancelling
 * never writes anything.
 */
export function MarketRecordReasonDialog({
  title,
  description,
  confirmLabel,
  reasonRequired,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  reasonRequired: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const errorId = useId();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const missing = reasonRequired && reason.trim() === "";

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const close = () => {
    if (!busy) onClose();
  };

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
          if (missing || busy) return;
          onConfirm(reason.trim());
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button type="button" onClick={close} aria-label="Close dialog" disabled={busy}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mb-4 text-sm text-neutral-600">{description}</p>
        <label htmlFor={reasonId} className="mb-1.5 block text-sm font-medium text-neutral-900">
          Reason{reasonRequired ? " (required)" : " (optional)"}
        </label>
        <textarea
          id={reasonId}
          disabled={busy}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={500}
          required={reasonRequired}
          aria-invalid={touched && missing}
          aria-describedby={touched && missing ? errorId : undefined}
          className="w-full rounded-lg bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
          style={{ border: "1px solid #E0E0E0" }}
        />
        {touched && missing && (
          <p id={errorId} className="mt-1 text-sm text-red-700">
            Enter a reason so the audit history explains this change.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy} aria-busy={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? "Saving…" : confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
