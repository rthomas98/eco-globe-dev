"use client";

import { useDemoUser } from "@/lib/demo-user";

import { useState } from "react";
import type { ApiWantedListing } from "@/lib/api-portal";
import { submitRfqResponse } from "@/lib/api-rfq";
import { fetchListings } from "@/lib/listings-api";
import { describeBackendError } from "@/lib/backend-client";
import { useBackendData } from "@/components/shared/data-state";
import { quantityUnitsMatch, quoteQuantityError } from "@/lib/quantity-units";

/** Seller quote for a buyer's request; shown as sent only after the backend saves it. */
export function RfqRespondForm({ wanted, onClose }: { wanted: ApiWantedListing; onClose: () => void }) {
  const companyId = useDemoUser()?.activeCompanyId;
  const owned = useBackendData(() => fetchListings("owned"), [companyId], "Your listings could not be loaded.");
  // Same unit rule as the backend: unit/units and tonne/tonnes/t are
  // equivalent; every other unit (including ton/tons) must match exactly.
  const eligible = (owned.data ?? []).filter(
    (l) =>
      l.listingStatusCode === "published" &&
      l.materialTypeCode === wanted.materialTypeCode &&
      quantityUnitsMatch(l.quantityUnit, wanted.quantityUnit),
  );
  const [listingId, setListingId] = useState<number | "">("");
  const chosen = eligible.find((l) => l.id === listingId) ?? null;
  // The quote is saved in the listing's own unit and currency.
  const quoteUnit = chosen?.quantityUnit ?? wanted.quantityUnit;
  const quoteCurrency = chosen?.currencyCode ?? null;
  const [quantity, setQuantity] = useState(String(wanted.quantity));
  const [unitPrice, setUnitPrice] = useState("");
  const [terms, setTerms] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const qty = Number(quantity);
    const price = Math.round(Number(unitPrice) * 100) / 100;
    if (!listingId || !chosen) {
      setError("Choose one of your matching listings.");
      return;
    }
    const quantityError = quoteQuantityError(qty, chosen, quoteUnit);
    if (quantityError) {
      setError(quantityError);
      return;
    }
    if (!(price > 0)) {
      setError("Enter a positive unit price.");
      return;
    }
    if (!quoteCurrency) {
      setError("This listing has no currency recorded. Add one to the listing before quoting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitRfqResponse(wanted.id, {
        listingId,
        quantity: qty,
        unitPrice: price,
        deliveryTerms: terms.trim() || undefined,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined,
      });
      setSent(true);
    } catch (err) {
      setError(describeBackendError(err, "Your response was not sent."));
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <div role="status" className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Response sent to the buyer.{" "}
        <button type="button" onClick={onClose} className="font-semibold underline">
          Close
        </button>
      </div>
    );

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-white p-3 ring-1 ring-neutral-200">
      {owned.status === "loading" && <p className="text-xs text-neutral-500">Loading your listings…</p>}
      {owned.status === "error" && <p className="text-xs text-red-700">{owned.error}</p>}
      {owned.status === "ready" && eligible.length === 0 && (
        <p className="text-xs text-neutral-600">
          You need a published {wanted.materialTypeName} listing sold per {wanted.quantityUnit} to respond. Listings in
          tons are not matched to tonne requests because tons may be short tons.
        </p>
      )}
      {eligible.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
            Listing
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value ? Number(e.target.value) : "")}
              className="rounded-lg px-2 py-1.5 text-sm ring-1 ring-neutral-200"
            >
              <option value="">Choose…</option>
              {eligible.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
            Quantity ({quoteUnit})
            <input type="number" min="0" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg px-2 py-1.5 text-sm ring-1 ring-neutral-200" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
            Unit price ({quoteCurrency ?? "choose a listing"})
            <input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="rounded-lg px-2 py-1.5 text-sm ring-1 ring-neutral-200" />
          </label>
          {chosen && (
            <p className="text-xs text-neutral-500 sm:col-span-2">
              Listing MOQ {chosen.minimumOrderQuantity ?? "not set"} · available {chosen.quantity ?? "not recorded"}{" "}
              {quoteUnit} · priced in {chosen.currencyCode ?? "no currency recorded"}
              {wanted.currencyCode && chosen.currencyCode && wanted.currencyCode !== chosen.currencyCode
                ? ` (the buyer's target is in ${wanted.currencyCode}; your quote stays in ${chosen.currencyCode})`
                : ""}
            </p>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
            Valid until (optional)
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="rounded-lg px-2 py-1.5 text-sm ring-1 ring-neutral-200" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 sm:col-span-2">
            Delivery terms (optional)
            <input maxLength={500} value={terms} onChange={(e) => setTerms(e.target.value)} className="rounded-lg px-2 py-1.5 text-sm ring-1 ring-neutral-200" />
          </label>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-neutral-300">
          Cancel
        </button>
        {eligible.length > 0 && (
          <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            {busy ? "Sending…" : "Send response"}
          </button>
        )}
      </div>
    </div>
  );
}
