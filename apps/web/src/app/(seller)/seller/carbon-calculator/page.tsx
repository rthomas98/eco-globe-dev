"use client";

import { useState } from "react";
import { TrendingDown, Coins } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "@/components/seller/seller-layout";
import { CarbonCalculatorModal, type CalculatorStart } from "@/components/buyer/carbon-calculator-modal";

export default function Page() {
  const [open, setOpen] = useState<CalculatorStart | null>(null);

  return (
    <SellerLayout title="Carbon Calculator">
      <div className="flex h-full flex-col items-center justify-center bg-neutral-50 px-8 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-neutral-900 text-white">
          <TrendingDown className="size-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-neutral-900">Carbon &amp; Value Calculator</h1>
        <p className="mt-3 max-w-[520px] text-base text-neutral-600">
          Estimate transportation footprints across your listings, run up to four scenarios side by side, and estimate the value you recover by selling feedstock instead of paying to dispose of it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" className="min-w-[220px]" onClick={() => setOpen("distance")}>
            Start a new calculation
          </Button>
          <Button variant="secondary" size="lg" className="min-w-[220px]" onClick={() => setOpen("value-recovery")}>
            <Coins className="size-4" />
            Estimate value recovery
          </Button>
        </div>
      </div>

      <CarbonCalculatorModal open={open !== null} portal="seller" startAt={open ?? undefined} onClose={() => setOpen(null)} />
    </SellerLayout>
  );
}
