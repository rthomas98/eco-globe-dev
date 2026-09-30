"use client";

import { useState } from "react";
import { Button } from "@eco-globe/ui";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import {
  createOrderRefund,
  formatRefundMoney,
  newRefundIdempotencyKey,
  parseAmountToCents,
  type RefundDetail,
} from "@/lib/api-refunds";
import { isValidRefundText, RefundTextArea } from "./refund-ui";

/**
 * Buyer refund request for one paid order. The amount is capped by the
 * refundable balance the backend read from Stripe; the backend re-validates
 * everything. One idempotency key per attempt makes a retried submit replay
 * instead of opening a second case.
 */
export function RefundRequestForm({
  orderId,
  availableCents,
  currencyCode,
  onCreated,
  onCancel,
}: {
  orderId: number;
  availableCents: number;
  currencyCode: string;
  onCreated: (detail: RefundDetail) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [key, setKey] = useState(newRefundIdempotencyKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const partialCents = parseAmountToCents(amount);
  const amountCents = mode === "full" ? availableCents : partialCents;
  const amountError =
    mode === "partial" && amount.trim() !== ""
      ? partialCents === null
        ? "Enter an amount such as 125.50."
        : partialCents > availableCents
          ? `The most you can request is ${formatRefundMoney(availableCents, currencyCode)}.`
          : ""
      : "";
  const valid =
    amountCents !== null && amountCents > 0 && amountCents <= availableCents && isValidRefundText(reason);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !valid || amountCents === null) return;
    setBusy(true);
    setError("");
    try {
      const detail = await createOrderRefund(orderId, {
        amountCents,
        reason: reason.trim(),
        idempotencyKey: key,
      });
      onCreated(detail);
    } catch (reason) {
      // Keep the key only when the outcome is unknown (timeout/network), so a
      // retry replays; a definite rejection gets a fresh key for the next try.
      if (!(isBackendApiError(reason) && reason.retryable)) setKey(newRefundIdempotencyKey());
      setError(describeBackendError(reason, "Your refund request was not recorded."));
    } finally {
      setBusy(false);
    }
  };

  const fieldPrefix = `order-${orderId}-refund`;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-neutral-900">Refund amount</legend>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`${fieldPrefix}-mode`}
              checked={mode === "full"}
              onChange={() => setMode("full")}
              disabled={busy}
            />
            Full refundable amount · {formatRefundMoney(availableCents, currencyCode)}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`${fieldPrefix}-mode`}
              checked={mode === "partial"}
              onChange={() => setMode("partial")}
              disabled={busy}
            />
            Partial amount
          </label>
        </div>
        {mode === "partial" && (
          <div className="mt-3 flex flex-col gap-1.5">
            <label htmlFor={`${fieldPrefix}-amount`} className="text-sm font-medium text-neutral-900">
              Amount ({currencyCode})
            </label>
            <input
              id={`${fieldPrefix}-amount`}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              placeholder="0.00"
              aria-invalid={Boolean(amountError)}
              aria-describedby={`${fieldPrefix}-amount-hint`}
              className="w-full max-w-[200px] rounded-lg bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            />
            <p
              id={`${fieldPrefix}-amount-hint`}
              className={`text-xs ${amountError ? "text-red-700" : "text-neutral-500"}`}
            >
              {amountError || `Up to ${formatRefundMoney(availableCents, currencyCode)}.`}
            </p>
          </div>
        )}
      </fieldset>

      <RefundTextArea
        id={`${fieldPrefix}-reason`}
        label="Reason for the refund"
        value={reason}
        onChange={setReason}
        disabled={busy}
        placeholder="Describe what went wrong with the order and what you expect."
      />

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={busy || !valid}>
          {busy ? "Submitting…" : "Submit refund request"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
