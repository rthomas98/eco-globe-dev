"use client";

import { LiveListingCard } from "./live-record-card";
import { AdminDetailPage } from "./admin-detail-page";

/** Listing record as stored by the backend; moderation actions live on the card. */
export function AdminListingDetailPage({ id }: { id: string }) {
  return (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Listings", href: "/admin/listings" },
        { label: id },
      ]}
      title={`Listing ${id}`}
    >
      <LiveListingCard uiId={id} />
    </AdminDetailPage>
  );
}
