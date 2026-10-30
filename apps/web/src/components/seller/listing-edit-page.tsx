"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { useDemoUser } from "@/lib/demo-user";
import { useListing } from "@/lib/use-listings";
import type { ListingStatusCode } from "@/lib/listings-api";
import { ListingEditForm, type ListingStatusChoice } from "./listing-edit-form";

const SELLER_WRITABLE_STATUSES: readonly ListingStatusCode[] = ["draft", "pending_review", "paused", "closed"];
const SELLER_SUBMISSION_STATUSES: readonly ListingStatusCode[] = ["pending_review"];

function sellerStatusChoices(current: string): ListingStatusChoice[] {
  const choices: ListingStatusChoice[] = [
    { value: "draft", label: "Draft" },
    { value: "pending_review", label: "Pending review (submit)" },
    { value: "paused", label: "Paused" },
    { value: "closed", label: "Closed" },
  ];
  if (current === "published") choices.unshift({ value: "published", label: "Published (edits return to review)" });
  return choices;
}

export function SellerListingEditPage({ id }: { id: string }) {
  const router = useRouter();
  const user = useDemoUser();
  const detail = useListing(id, "owned", { enabled: !!user });

  if (!user) return <SellerLayout title="Edit listing"><p className="p-8 text-sm text-neutral-600">Sign in to edit this listing.</p></SellerLayout>;
  if (detail.status === "loading") return <SellerLayout title="Edit listing"><p className="p-8 text-sm text-neutral-600" role="status">Loading listing…</p></SellerLayout>;
  if (detail.status === "not-found") {
    return (
      <SellerLayout title="Edit listing">
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <p className="text-lg font-bold text-neutral-900">Listing not found</p>
          <p className="mt-2 text-sm text-neutral-500">No listing with id <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code> belongs to your company.</p>
          <Link href="/seller/listings" className="mt-6"><Button variant="primary" size="md">Back to listings</Button></Link>
        </div>
      </SellerLayout>
    );
  }
  if (detail.status === "error" || !detail.record) {
    return (
      <SellerLayout title="Edit listing">
        <div className="m-8 rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
          <p>{detail.error}</p>
          <button type="button" onClick={detail.reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" /> Retry</button>
        </div>
      </SellerLayout>
    );
  }
  return (
    <SellerLayout title="Edit listing">
      <ListingEditForm
        key={detail.record.id}
        record={detail.record}
        onSaved={(saved) => { detail.replace(saved); router.push(`/seller/listings/${saved.id}`); }}
        onCancel={() => router.push(`/seller/listings/${id}`)}
        statusChoices={sellerStatusChoices(detail.record.listingStatusCode)}
        writableStatuses={SELLER_WRITABLE_STATUSES}
        submissionStatuses={SELLER_SUBMISSION_STATUSES}
        statusHelp="Only EcoGlobe admins can publish. Submitting requires an SDS on file."
        backLink={{ href: `/seller/listings/${detail.record.id}`, label: "Back to listing" }}
        title="Edit listing"
      />
    </SellerLayout>
  );
}
