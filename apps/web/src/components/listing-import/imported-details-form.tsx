"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import { QUANTITY_UNIT_CODES, updateListing, type CompanyLocation } from "@/lib/listings-api";
import {
  detailsDraftFrom,
  parseDetailsDraft,
  type ImportedDetailsDraft,
  type ImportedListingState,
} from "@/lib/listing-import-format";

const field = "w-full rounded-lg bg-white px-3 py-2 text-sm";
const border = { border: "1px solid #E0E0E0" };

/**
 * Fills in what an imported draft still needs before it can be submitted.
 * Works for sellers and admins alike (both may PATCH a draft), so admins do
 * not need a separate listing editor to finish an import.
 */
export function ImportedDetailsForm({
  listingId,
  title,
  state,
  locations,
  onSaved,
  locked,
  onSaveStart,
  onSaveEnd,
  onCancel,
}: {
  listingId: number;
  title: string;
  state: ImportedListingState;
  locations: CompanyLocation[];
  onSaved: (listingId: number) => void;
  /** Another page action is running; saving waits for it. */
  locked: boolean;
  /** Takes the page-wide operation lock; false when another action holds it. */
  onSaveStart: () => boolean;
  /** Releases the lock taken by onSaveStart. */
  onSaveEnd: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<ImportedDetailsDraft>(() => detailsDraftFrom(state));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof ImportedDetailsDraft) => (event: { target: { value: string } }) =>
    setDraft((previous) => ({ ...previous, [key]: event.target.value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseDetailsDraft(draft);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    if (!onSaveStart()) {
      setError("Another action is still running. Save again when it finishes.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateListing(listingId, parsed.body);
      onSaveEnd();
      onSaved(listingId);
    } catch (caught) {
      setError(describeBackendError(caught, "The details could not be saved."));
      setBusy(false);
      onSaveEnd();
    }
  };

  const label = (key: string, text: string) => (
    <label htmlFor={`${id}-${key}`} className="mb-1 block text-xs font-medium text-neutral-700">
      {text}
    </label>
  );

  return (
    <form onSubmit={(event) => void save(event)} aria-label={`Complete details for ${title}`} className="rounded-xl bg-neutral-50 p-3">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">Complete details: {title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          {label("quantity", "Quantity")}
          <input id={`${id}-quantity`} inputMode="decimal" value={draft.quantity} onChange={set("quantity")} className={field} style={border} />
        </div>
        <div>
          {label("unit", "Unit")}
          <select id={`${id}-unit`} value={draft.quantityUnit} onChange={set("quantityUnit")} className={field} style={border}>
            {QUANTITY_UNIT_CODES.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
        <div>
          {label("moq", "Minimum order")}
          <input id={`${id}-moq`} inputMode="decimal" value={draft.minimumOrderQuantity} onChange={set("minimumOrderQuantity")} className={field} style={border} />
        </div>
        <div>
          {label("price", "Price per unit")}
          <input id={`${id}-price`} inputMode="decimal" value={draft.pricePerUnit} onChange={set("pricePerUnit")} className={field} style={border} />
        </div>
        <div>
          {label("currency", "Currency")}
          <input id={`${id}-currency`} maxLength={3} value={draft.currencyCode} onChange={set("currencyCode")} className={`${field} uppercase`} style={border} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          {label("facility", "Facility")}
          <select id={`${id}-facility`} value={draft.locationId} onChange={set("locationId")} className={field} style={border}>
            <option value="">Choose…</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" className="rounded-full bg-white px-4 py-2" style={border} disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" className="rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={busy || locked} aria-busy={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {busy ? "Saving…" : "Save details"}
        </Button>
      </div>
    </form>
  );
}
