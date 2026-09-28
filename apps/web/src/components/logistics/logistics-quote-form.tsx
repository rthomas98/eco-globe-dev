"use client";

import { useId, useState } from "react";
import { Button, Input, Select } from "@eco-globe/ui";
import {
  recordLogisticsQuote,
  type LogisticsCarrier,
  type LogisticsOrder,
} from "@/lib/api-logistics";
import { describeBackendError } from "@/lib/backend-client";

/** `datetime-local` value for an ISO timestamp, in the viewer's timezone. */
function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Manual shipping quote recorded by the seller or EcoGlobe staff. Saving
 * records an offer for the buyer; it books no carrier and charges nothing.
 */
export function LogisticsQuoteForm({
  order,
  carriers,
  onSaved,
  onCancel,
}: {
  order: LogisticsOrder;
  carriers: LogisticsCarrier[];
  onSaved: () => Promise<void> | void;
  onCancel?: () => void;
}) {
  const baseId = useId();
  const existing = order.quote?.status === "offered" ? order.quote : null;
  const activeCarriers = carriers.filter((carrier) => carrier.isActive);
  const [carrierId, setCarrierId] = useState(
    existing && activeCarriers.some((c) => c.id === existing.carrierId) ? String(existing.carrierId) : "",
  );
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [pickup, setPickup] = useState(toLocalInput(existing?.pickupScheduledAt));
  const [eta, setEta] = useState(toLocalInput(existing?.estimatedDeliveryAt));
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currency = order.currencyCode;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!currency) {
      setError("This order has no currency recorded, so a quote cannot be saved. Contact EcoGlobe staff.");
      return;
    }
    const carrier = Number(carrierId);
    const cost = Number(amount);
    const pickupDate = new Date(pickup);
    const etaDate = eta ? new Date(eta) : null;
    if (!Number.isInteger(carrier) || carrier <= 0) {
      setError("Choose a carrier.");
      return;
    }
    if (!amount.trim() || !Number.isFinite(cost) || cost < 0 || Math.abs(cost * 100 - Math.round(cost * 100)) > 1e-6) {
      setError("Enter a shipping cost of zero or more, with at most two decimals.");
      return;
    }
    if (!pickup || !Number.isFinite(pickupDate.getTime()) || pickupDate.getTime() <= Date.now()) {
      setError("Choose a pickup date and time in the future.");
      return;
    }
    if (etaDate && (!Number.isFinite(etaDate.getTime()) || etaDate < pickupDate)) {
      setError("Estimated delivery must be after pickup.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await recordLogisticsQuote({
        orderId: order.id,
        carrierId: carrier,
        amount: cost,
        currencyCode: currency,
        pickupScheduledAt: pickupDate.toISOString(),
        ...(etaDate ? { estimatedDeliveryAt: etaDate.toISOString() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      await onSaved();
    } catch (caught) {
      setError(describeBackendError(caught, "The quote could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-neutral-600">
        {existing
          ? "Replacing the offer withdraws the current quote before the buyer accepts it."
          : "Record the carrier cost you arranged. The buyer approves it before EcoGlobe staff coordinate pickup."}{" "}
        No carrier is booked and nothing is charged from this form.
      </p>
      {activeCarriers.length === 0 ? (
        <p role="status" className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          No active carriers are listed. Ask EcoGlobe staff to enable a carrier before recording a quote.
        </p>
      ) : (
        <Select
          id={`${baseId}-carrier`}
          label="Carrier"
          value={carrierId}
          onChange={(event) => setCarrierId(event.target.value)}
          required
          options={activeCarriers.map((carrier) => ({ value: String(carrier.id), label: carrier.name }))}
        />
      )}
      <Input
        id={`${baseId}-amount`}
        label={`Shipping cost${currency ? ` (${currency})` : ""}`}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id={`${baseId}-pickup`}
          label="Pickup date and time"
          type="datetime-local"
          value={pickup}
          onChange={(event) => setPickup(event.target.value)}
          required
        />
        <Input
          id={`${baseId}-eta`}
          label="Estimated delivery (optional)"
          type="datetime-local"
          value={eta}
          onChange={(event) => setEta(event.target.value)}
        />
      </div>
      <Input
        id={`${baseId}-note`}
        label="Note for the buyer (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={1000}
      />
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
        <Button type="submit" variant="primary" size="sm" disabled={busy || activeCarriers.length === 0}>
          {busy ? "Saving…" : existing ? "Replace quote" : "Record quote"}
        </Button>
      </div>
    </form>
  );
}
