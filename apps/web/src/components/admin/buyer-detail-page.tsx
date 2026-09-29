"use client";

import { LiveCompanyCard } from "./live-record-card";
import { AdminDetailPage } from "./admin-detail-page";

/** Buyer company record as stored by the backend. */
export function AdminBuyerDetailPage({ id }: { id: string }) {
  return (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Buyers", href: "/admin/buyers" },
        { label: id },
      ]}
      title={`Buyer ${id}`}
    >
      <LiveCompanyCard uiId={id} kind="buyer" />
    </AdminDetailPage>
  );
}
