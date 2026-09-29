"use client";

import { useState } from "react";
import { fetchRfqResponses, setQuoteStatus, type RfqResponse } from "@/lib/api-rfq";
import { checkoutAttemptKey, clearCheckoutAttemptKey, startCheckout } from "@/lib/api-orders";
import { describeBackendError, isBackendApiError } from "@/lib/backend-client";
import { portalDate, portalMoney } from "@/lib/api-portal";
import { ErrorState, LoadingState, useBackendData } from "@/components/shared/data-state";

/**
 * Seller quotes for one request. Accept/decline and checkout only change the
 * screen after the backend confirms; payment goes through Stripe Checkout.
 */
export function RfqResponses({ wantedListingId }: { wantedListingId: number }) {
  const responses = useBackendData(
    () => fetchRfqResponses(wantedListingId),
    [wantedListingId],
    "Seller responses could not be loaded.",
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (quote: RfqResponse, status: "accepted" | "declined") => {
    setBusyId(quote.id);
    setError(null);
    try {
      await setQuoteStatus(quote.id, status);
      responses.reload();
    } catch (err) {
      setError(describeBackendError(err, "The decision was not saved."));
    } finally {
      setBusyId(null);
    }
  };

  if (responses.status === "loading" && !responses.data) return <LoadingState label="Loading seller responses…" />;
  if (responses.status === "error")
    return <ErrorState message={responses.error ?? ""} onRetry={responses.reload} />;
  const rows = responses.data ?? [];
  if (rows.length === 0)
    return <p className="mt-2 text-sm text-neutral-700">No seller has responded to this request yet.</p>;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {rows.map((quote) => {
        const expired = quote.expiresAt ? new Date(quote.expiresAt).getTime() < Date.now() : false;
        return (
          <div key={quote.id} className="rounded-xl bg-white p-4 ring-1 ring-neutral-200">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{quote.sellerCompanyName}</p>
                <p className="text-xs text-neutral-500">
                  {quote.listingTitle} · responded {portalDate(quote.createdAt)}
                  {quote.expiresAt ? ` · valid until ${portalDate(quote.expiresAt)}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-neutral-700">
                {expired && quote.quoteStatusCode !== "accepted" ? "expired" : quote.quoteStatusCode.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-800">
              {quote.quantity} {quote.quantityUnit} at {portalMoney(Number(quote.unitPrice), quote.currencyCode)} per{" "}
              {quote.quantityUnit} ·{" "}
              <span className="font-semibold">
                {portalMoney(Number(quote.unitPrice) * Number(quote.quantity), quote.currencyCode)} total
              </span>
            </p>
            {quote.deliveryTerms && <p className="mt-1 text-xs text-neutral-600">Delivery: {quote.deliveryTerms}</p>}
            {!expired && !["accepted", "declined"].includes(quote.quoteStatusCode) && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void decide(quote, "declined")}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 ring-1 ring-neutral-300 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void decide(quote, "accepted")}
                  className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {busyId === quote.id ? "Saving…" : "Accept quote"}
                </button>
              </div>
            )}
            {quote.quoteStatusCode === "accepted" && !expired && <QuoteCheckout quote={quote} />}
          </div>
        );
      })}
    </div>
  );
}

function QuoteCheckout({ quote }: { quote: RfqResponse }) {
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (method === "delivery" && !address.trim()) {
      setError("Enter the delivery address.");
      return;
    }
    const signature = JSON.stringify(["quote", quote.id, method, address.trim()]);
    const idempotencyKey = checkoutAttemptKey(signature);
    setBusy(true);
    setError(null);
    try {
      const result = await startCheckout({
        listingId: quote.listingId,
        quantity: Number(quote.quantity),
        quoteId: quote.id,
        idempotencyKey,
        deliveryMethod: method,
        deliveryAddress: method === "delivery" ? address.trim() : undefined,
      });
      if (result.payment?.checkoutUrl) {
        window.location.assign(result.payment.checkoutUrl);
        return;
      }
      setError(
        result.status === "paid"
          ? `Order EG-${result.orderId} for this quote is already paid.`
          : result.status === "expired"
            ? "This checkout expired. Try again to start a new one."
            : "The payment page could not be opened. Please try again.",
      );
      if (result.status !== "awaiting_payment") clearCheckoutAttemptKey(signature);
    } catch (err) {
      setError(
        isBackendApiError(err) && err.status === 503
          ? `${err.message} Nothing was charged.`
          : describeBackendError(err, "Checkout could not start. Nothing was charged."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg bg-neutral-50 p-3">
      <p className="text-xs font-semibold text-neutral-900">Pay for this accepted quote</p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={method === "pickup"} onChange={() => setMethod("pickup")} /> Pickup
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={method === "delivery"} onChange={() => setMethod("delivery")} /> Delivery
        </label>
      </div>
      {method === "delivery" && (
        <input
          aria-label="Delivery address"
          placeholder="Delivery address"
          value={address}
          maxLength={400}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-neutral-200"
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void pay()}
        className="w-fit rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Opening secure payment…" : "Continue to secure payment"}
      </button>
    </div>
  );
}
