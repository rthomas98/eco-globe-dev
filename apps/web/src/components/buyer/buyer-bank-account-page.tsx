"use client";

import { StripePaymentSetup } from "@/components/payments/stripe-payment-setup";
import { BuyerLayout } from "./buyer-layout";

export function BuyerBankAccountPage() {
  return (
    <BuyerLayout>
      <div className="h-full overflow-y-auto bg-neutral-50">
        <StripePaymentSetup role="buyer" />
      </div>
    </BuyerLayout>
  );
}
