"use client";

import { LivePaymentCard } from "./live-record-card";
import { AdminDetailPage } from "./admin-detail-page";

/** Payment record as stored by the backend. */
export function AdminTransactionDetailPage({ id }: { id: string }) {
  return (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Accounting", href: "/admin/accounting" },
        { label: "Transactions", href: "/admin/accounting/transactions" },
        { label: id },
      ]}
      title={`Transaction ${id}`}
    >
      <LivePaymentCard uiId={id} />
    </AdminDetailPage>
  );
}
