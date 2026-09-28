"use client";

import { useId, useState } from "react";
import { Button, Input } from "@eco-globe/ui";
import type { ReceiptDetails } from "@/lib/api-logistics";
import { describeBackendError } from "@/lib/backend-client";

/**
 * Receipt evidence the buyer records for a delivery or a pickup. Submitting
 * completes the order; it never releases escrow or moves funds.
 */
export function ReceiptConfirmationForm({
  kind,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  kind: "delivery" | "pickup";
  onSubmit: (details: ReceiptDetails) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const baseId = useId();
  const [receiverName, setReceiverName] = useState("");
  const [notes, setNotes] = useState("");
  const [inspectionComplete, setInspectionComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pickup = kind === "pickup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!receiverName.trim()) {
      setError(pickup ? "Enter who collected the material." : "Enter who received the delivery.");
      return;
    }
    if (!inspectionComplete) {
      setError("Confirm the material was inspected before recording receipt.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        receiverName: receiverName.trim(),
        notes: notes.trim() || undefined,
        inspectionComplete: true,
      });
    } catch (caught) {
      setError(describeBackendError(caught, "Receipt could not be recorded."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={`${baseId}-help`} noValidate>
      <p id={`${baseId}-help`} className="text-sm text-neutral-600">
        {pickup
          ? "Record who collected the material and confirm it was inspected at pickup."
          : "Record who received the delivery and confirm the material was inspected."}{" "}
        This completes the order. Payment settlement is handled separately by EcoGlobe staff.
      </p>
      <Input
        id={`${baseId}-receiver`}
        label={pickup ? "Collected by" : "Received by"}
        value={receiverName}
        onChange={(event) => setReceiverName(event.target.value)}
        required
        maxLength={200}
        autoComplete="name"
        placeholder="Full name"
      />
      <div className="flex flex-col gap-2">
        <label htmlFor={`${baseId}-notes`} className="text-base font-medium text-neutral-900">
          {pickup ? "Pickup notes (optional)" : "Delivery notes (optional)"}
        </label>
        <textarea
          id={`${baseId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full rounded-lg bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-neutral-900/20"
          style={{ border: "1px solid #E0E0E0" }}
          placeholder="Condition, quantity checks or exceptions"
        />
      </div>
      <label className="flex items-start gap-3 text-sm text-neutral-800">
        <input
          type="checkbox"
          checked={inspectionComplete}
          onChange={(event) => setInspectionComplete(event.target.checked)}
          className="mt-0.5 size-4"
          required
        />
        <span>I inspected the material and confirm it was received.</span>
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" disabled={busy}>
          {busy ? "Recording…" : (submitLabel ?? (pickup ? "Record pickup receipt" : "Record delivery receipt"))}
        </Button>
      </div>
    </form>
  );
}
