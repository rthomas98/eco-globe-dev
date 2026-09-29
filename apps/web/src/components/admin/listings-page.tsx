"use client";

import { LiveProductsReport } from "@/components/reports/live-reports";

/** Admin listings: every listing with its recorded order activity. */
export function AdminListingsPage() {
  return <LiveProductsReport scope={{ kind: "admin" }} title="Listings" rowHref={(listing) => `/admin/listings/LS-${listing.id}`} />;
}
