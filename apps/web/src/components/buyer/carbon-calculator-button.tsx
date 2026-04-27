"use client";

import { useState } from "react";
import { TrendingDown } from "lucide-react";
import { CarbonCalculatorModal } from "./carbon-calculator-modal";

interface Props {
  listingId?: string;
  variant?: "primary" | "ghost" | "icon";
  label?: string;
}

export function CarbonCalculatorButton({
  listingId,
  variant = "ghost",
  label = "Calculate footprint",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Carbon Calculator"
          className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <TrendingDown className="size-4" />
        </button>
      ) : variant === "primary" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          <TrendingDown className="size-4" />
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100"
          style={{ border: "1px solid #E0E0E0" }}
        >
          <TrendingDown className="size-3.5" />
          {label}
        </button>
      )}

      <CarbonCalculatorModal
        open={open}
        initialListingId={listingId}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
