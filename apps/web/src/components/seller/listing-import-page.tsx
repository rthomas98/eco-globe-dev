"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SellerLayout } from "./seller-layout";
import { ListingImportFlow } from "@/components/listing-import/listing-import-flow";
import { LoadingState } from "@/components/shared/data-state";
import { useDemoUser } from "@/lib/demo-user";

const PATH = "/seller/listings/import";

function SellerImport() {
  const user = useDemoUser();
  const previewId = useSearchParams().get("preview");
  const companyId = user?.activeCompanyId;
  if (!user) return <LoadingState label="Loading your account…" />;
  if (!companyId)
    return <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Choose your seller company before importing listings.</p>;
  return (
    <ListingImportFlow
      mode="seller"
      sellerCompanyId={companyId}
      previewId={previewId}
      hrefFor={(id) => (id ? `${PATH}?preview=${encodeURIComponent(id)}` : PATH)}
      editHref={(id) => `/seller/listings/${id}/edit`}
      listingsHref="/seller/listings"
    />
  );
}

/** Seller: create many draft listings from one spreadsheet. */
export function SellerListingImportPage() {
  return (
    <SellerLayout title="Import listings">
      <Link href="/seller/listings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="size-4" aria-hidden /> Listings
      </Link>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">Import listings from a spreadsheet</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">Add many listings at once. They are saved as drafts for you to finish and submit.</p>
      </div>
      <Suspense fallback={<LoadingState label="Loading import…" />}>
        <SellerImport />
      </Suspense>
    </SellerLayout>
  );
}
