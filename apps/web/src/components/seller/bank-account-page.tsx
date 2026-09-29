"use client";

import { StripePaymentSetup } from "@/components/payments/stripe-payment-setup";
import { SellerLayout } from "./seller-layout";

export function BankAccountPage() {
  return (
    <SellerLayout title="Bank Account">
      <StripePaymentSetup role="seller" />
    </SellerLayout>
  );
}
