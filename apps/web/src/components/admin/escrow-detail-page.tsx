"use client";

import { LiveEscrowCard } from "./live-record-card";
import { AdminDetailPage } from "./admin-detail-page";

/** Escrow record as stored by the backend; actions live on the card. */
export function AdminEscrowDetailPage({ id }: { id: string }) {
  return (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Accounting", href: "/admin/accounting" },
        { label: "Escrow", href: "/admin/accounting/escrow" },
        { label: id },
      ]}
      title={`Escrow ${id}`}
    >
      <LiveEscrowCard uiId={id} />
    </AdminDetailPage>
  );
}
