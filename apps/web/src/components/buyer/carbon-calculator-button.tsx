"use client";

import { useState } from "react";
import { TrendingDown, Coins } from "lucide-react";
import type { Listing } from "@/components/public/browse-listings";
import { CarbonCalculatorModal, type CalculatorPortal, type CalculatorStart } from "./carbon-calculator-modal";

interface Props {
  /** Persisted listing to seed the first scenario. */
  listing?: Listing;
  /** Canonical listing id; the modal loads it when `listing` is not supplied. */
  listingId?: string;
  /** Explicit portal context for the value-recovery step (buyer vs seller). */
  portal?: CalculatorPortal;
  /** Quantity (in the listing's pricing unit) selected by the buyer. */
  initialQuantity?: number;
  /** Open directly on the value-recovery step. */
  startAt?: CalculatorStart;
  variant?: "primary" | "ghost" | "icon";
  label?: string;
}

export function CarbonCalculatorButton({
  listing,
  listingId,
  portal,
  initialQuantity,
  startAt,
  variant = "ghost",
  label = "Calculate footprint",
}: Props) {
  const [open, setOpen] = useState(false);
  const Icon = startAt === "value-recovery" ? Coins : TrendingDown;

  return (
    <>
      {variant === "icon" ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={label} className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
          <Icon className="size-4" />
        </button>
      ) : variant === "primary" ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:opacity-90">
          <Icon className="size-4" />
          {label}
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100" style={{ border: "1px solid #E0E0E0" }}>
          <Icon className="size-3.5" />
          {label}
        </button>
      )}

      <CarbonCalculatorModal
        open={open}
        listing={listing}
        initialListingId={listing?.id ?? listingId}
        portal={portal}
        initialQuantity={initialQuantity}
        startAt={startAt}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
