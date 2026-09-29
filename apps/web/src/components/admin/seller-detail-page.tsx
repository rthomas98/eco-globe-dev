"use client";

import { LiveCompanyCard } from "./live-record-card";
import { AdminDetailPage } from "./admin-detail-page";

/** Seller company record as stored by the backend. */
export function AdminSellerDetailPage({ id }: { id: string }) {
  return (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Sellers", href: "/admin/sellers" },
        { label: id },
      ]}
      title={`Seller ${id}`}
    >
      <LiveCompanyCard uiId={id} kind="seller" />
    </AdminDetailPage>
  );
}
