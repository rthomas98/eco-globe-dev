"use client";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { createSampleRequest } from "@/lib/api-samples";

/**
 * "Request a Sample" modal: a 5–10 lb lab test batch ordered before
 * committing to a bulk escrow purchase. Live listings only.
 */
export function RequestSampleModal({
  listingId,
  listingTitle,
  onClose,
}: {
  listingId: number;
  listingTitle: string;
  onClose: () => void;
}) {
  const [quantityLb, setQuantityLb] = useState("5");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await createSampleRequest({
        listingId,
        quantityLb: parseFloat(quantityLb) || 5,
        note: note.trim() || undefined,
        deliveryAddress: address.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[520px] rounded-2xl bg-white p-8"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-900">
            <FlaskConical className="size-5" />
            Request a sample
          </h2>
          <button onClick={onClose} className="text-neutral-400" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-lg font-bold text-neutral-900">Sample requested</p>
            <p className="max-w-[360px] text-sm text-neutral-600">
              The seller has been notified. You&apos;ll get a notification when
              they accept and ship — track it under My Orders → Sample requests.
            </p>
            <Button variant="primary" size="md" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-neutral-600">
              Order a small lab test batch of{" "}
              <span className="font-semibold text-neutral-900">{listingTitle}</span>{" "}
              before committing to a bulk order. The seller reviews and ships
              samples directly.
            </p>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-neutral-900" htmlFor="sample-qty">
                Sample size
              </label>
              <select
                id="sample-qty"
                value={quantityLb}
                onChange={(e) => setQuantityLb(e.target.value)}
                className="h-11 w-full rounded-lg bg-white px-3 text-sm text-neutral-900"
                style={{ border: "1px solid #E0E0E0" }}
              >
                <option value="5">5 lb</option>
                <option value="10">10 lb</option>
                <option value="25">25 lb</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-neutral-900" htmlFor="sample-address">
                Ship to
              </label>
              <input
                id="sample-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city, state, ZIP"
                className="h-11 w-full rounded-lg px-3 text-sm outline-none placeholder:text-neutral-400"
                style={{ border: "1px solid #E0E0E0" }}
              />
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-neutral-900" htmlFor="sample-note">
                Note to seller <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <textarea
                id="sample-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What will you be testing for?"
                className="w-full resize-none rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400"
                style={{ border: "1px solid #E0E0E0" }}
              />
            </div>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="md" disabled={busy} onClick={() => void submit()}>
                {busy ? "Sending..." : "Send request"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
