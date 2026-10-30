"use client";

import { useEffect, useId, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { CLOSE_LISTING_EXPLANATION } from "@/lib/admin-listings";

/**
 * Native modal confirmation before closing (soft-deleting) a listing.
 * Cancelling never writes anything.
 */
export function CloseListingDialog({
  listingLabel,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  listingLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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
      className="m-auto w-[min(92vw,480px)] rounded-2xl bg-white p-6 text-neutral-950 shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-lg font-bold">
          Close {listingLabel}?
        </h2>
        <button type="button" onClick={close} aria-label="Close dialog" disabled={busy}>
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <p className="text-sm text-neutral-600">{CLOSE_LISTING_EXPLANATION}</p>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={close} disabled={busy}>
          Keep listing
        </Button>
        <Button type="button" size="sm" onClick={onConfirm} disabled={busy} aria-busy={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {busy ? "Closing…" : "Close listing"}
        </Button>
      </div>
    </dialog>
  );
}
