"use client";

import { Receipt } from "lucide-react";
import { SellerLayout } from "./seller-layout";

export function TransactionsPage() {
  return (
    <SellerLayout title="Transactions">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">Transactions</h1>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl bg-white py-24 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
          <Receipt className="size-6 text-neutral-500" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">
          No transactions yet
        </h2>
        <p className="max-w-sm text-sm text-neutral-500">
          Your sales, payouts, and fees will appear here once orders begin
          processing.
        </p>
      </div>
    </SellerLayout>
  );
}
