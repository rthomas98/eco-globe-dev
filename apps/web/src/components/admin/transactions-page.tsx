"use client";

import { DemoOrdersPanel } from "@/components/demo/demo-orders-panel";
import { LivePaymentsLedger } from "@/components/reports/live-reports";

/** Admin transactions: payment records confirmed on the backend. */
export function TransactionsPage() {
  return (
    <div className="flex h-full flex-col">
      <DemoOrdersPanel />
      <LivePaymentsLedger rowHref={(id) => `/admin/accounting/transactions/TX-${id}`} />
    </div>
  );
}
