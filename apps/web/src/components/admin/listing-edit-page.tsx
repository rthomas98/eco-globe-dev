"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { useDemoUser } from "@/lib/demo-user";
import { useListing } from "@/lib/use-listings";
import { adminListingKey } from "@/lib/admin-listings";
import type { ListingStatusCode } from "@/lib/listings-api";
import { ListingEditForm, type ListingStatusChoice } from "@/components/seller/listing-edit-form";
import { AdminDetailPage } from "./admin-detail-page";

const ADMIN_STATUS_CHOICES: ListingStatusChoice[] = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending review" },
  { value: "published", label: "Published" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];
const ADMIN_WRITABLE_STATUSES: readonly ListingStatusCode[] = ADMIN_STATUS_CHOICES.map((choice) => choice.value);
const ADMIN_SUBMISSION_STATUSES: readonly ListingStatusCode[] = ["pending_review", "published"];

/** Shown after /admin/listings/new redirects here with ?created=1. */
function CreatedNotice() {
  const created = useSearchParams().get("created") === "1";
  if (!created) return null;
  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900" style={{ border: "1px solid #BBF7D0" }}>
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      <p>
        Draft listing created. Upload the Safety Data Sheet (SDS) below, choose where it ships from, then set the status to
        Published (or Pending review) and save.
      </p>
    </div>
  );
}

/** Admin edit of any seller's listing, using the seller listing form. */
export function AdminListingEditPage({ id }: { id: string }) {
  const router = useRouter();
  const user = useDemoUser();
  // Admin ids may be shown as LS-<id>. The owned scope returns any listing for an admin session.
  const listingKey = adminListingKey(id);
  const detail = useListing(listingKey, "owned", { enabled: !!user });
  const record = detail.record;

  const page = (children: React.ReactNode, subtitle?: React.ReactNode) => (
    <AdminDetailPage
      breadcrumbs={[
        { label: "Listings", href: "/admin/listings" },
        { label: id, href: `/admin/listings/${id}` },
        { label: "Edit" },
      ]}
      title={record ? `Edit ${record.title}` : "Edit listing"}
      subtitle={subtitle}
    >
      {children}
    </AdminDetailPage>
  );

  if (!user) return page(<p className="text-sm text-neutral-600">Sign in as an EcoGlobe admin to edit this listing.</p>);
  if (detail.status === "loading") return page(<p className="text-sm text-neutral-600" role="status">Loading listing…</p>);
  if (detail.status === "not-found") {
    return page(
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-bold text-neutral-900">Listing not found</p>
        <p className="mt-2 text-sm text-neutral-500">No listing with id <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code> exists.</p>
        <Link href="/admin/listings" className="mt-6"><Button variant="primary" size="md">Back to listings</Button></Link>
      </div>,
    );
  }
  if (detail.status === "error" || !record) {
    return page(
      <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
        <p>{detail.error}</p>
        <button type="button" onClick={detail.reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" /> Retry</button>
      </div>,
    );
  }

  const seller = record.sellerCompanyName ?? `Company ${record.sellerCompanyId ?? "unknown"}`;
  return page(
    <>
      <Suspense fallback={null}>
        <CreatedNotice />
      </Suspense>
      <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" style={{ border: "1px solid #FDE68A" }}>
        <Building2 className="mt-0.5 size-4 shrink-0" />
        <p>
          You are editing this listing on behalf of{" "}
          {record.sellerCompanyId ? (
            <Link href={`/admin/sellers/${record.sellerCompanyId}`} className="font-semibold underline">{seller}</Link>
          ) : (
            <span className="font-semibold">{seller}</span>
          )}
          . Changes and documents are saved to the seller&apos;s live listing.
        </p>
      </div>
      <ListingEditForm
        key={record.id}
        record={record}
        onSaved={(saved) => { detail.replace(saved); router.push(`/admin/listings/${saved.id}`); }}
        onCancel={() => router.push(`/admin/listings/${id}`)}
        statusChoices={ADMIN_STATUS_CHOICES}
        writableStatuses={ADMIN_WRITABLE_STATUSES}
        submissionStatuses={ADMIN_SUBMISSION_STATUSES}
        statusHelp="Admins may publish directly. Publishing or submitting requires an SDS on file and complete pricing, supply and location."
        className=""
      />
    </>,
    <>Seller: <span className="font-semibold text-neutral-900">{seller}</span> · Listing #{record.id}</>,
  );
}
