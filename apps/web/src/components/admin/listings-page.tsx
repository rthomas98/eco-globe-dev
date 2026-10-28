"use client";

import Link from "next/link";
import { LiveProductsReport } from "@/components/reports/live-reports";

/** Admin listings: every listing with its recorded order activity. */
export function AdminListingsPage() {
  return (
    <LiveProductsReport
      scope={{ kind: "admin" }}
      title="Listings"
      rowHref={(listing) => `/admin/listings/LS-${listing.id}`}
      actions={
        <Link href="/admin/listings/import" className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          Import from spreadsheet
        </Link>
      }
    />
  );
}
