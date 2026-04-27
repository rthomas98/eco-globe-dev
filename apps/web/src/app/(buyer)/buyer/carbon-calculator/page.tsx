"use client";

import { useState } from "react";
import { TrendingDown } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "@/components/buyer/buyer-layout";
import { CarbonCalculatorModal } from "@/components/buyer/carbon-calculator-modal";

export default function Page() {
  const [open, setOpen] = useState(false);

  return (
    <BuyerLayout>
      <div className="flex h-full flex-col items-center justify-center bg-neutral-50 px-8 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-neutral-900 text-white">
          <TrendingDown className="size-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-neutral-900">
          Carbon Calculator
        </h1>
        <p className="mt-3 max-w-[520px] text-base text-neutral-600">
          Compare transportation footprints across feedstocks. Run up to four
          scenarios side by side and see your annualized impact instantly.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="mt-8 min-w-[220px]"
          onClick={() => setOpen(true)}
        >
          Start a new calculation
        </Button>
      </div>

      <CarbonCalculatorModal open={open} onClose={() => setOpen(false)} />
    </BuyerLayout>
  );
}
