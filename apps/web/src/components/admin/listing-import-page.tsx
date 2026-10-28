"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ListingImportFlow } from "@/components/listing-import/listing-import-flow";
import { DataBoundary, LoadingState, useBackendData } from "@/components/shared/data-state";
import { fetchCompanies } from "@/lib/api-portal";

const PATH = "/admin/listings/import";

function href(companyId: number | null, previewId: string | null) {
  const params = new URLSearchParams();
  if (companyId) params.set("company", String(companyId));
  if (previewId) params.set("preview", previewId);
  const query = params.toString();
  return query ? `${PATH}?${query}` : PATH;
}

function AdminImport() {
  const router = useRouter();
  const params = useSearchParams();
  const companyParam = Number(params.get("company"));
  const companyId = Number.isInteger(companyParam) && companyParam > 0 ? companyParam : null;
  const previewId = params.get("preview");
  const companies = useBackendData(fetchCompanies, [], "Seller companies could not be loaded.");
  const sellers = useMemo(
    () =>
      (companies.data ?? [])
        .filter((c) => c.companyTypeCode === "seller" || c.companyTypeCode === "both")
        .sort((a, b) => a.legalName.localeCompare(b.legalName)),
    [companies.data],
  );

  return (
    <DataBoundary state={companies} empty={{ title: "No companies" }} loadingLabel="Loading seller companies…">
      {() => (
        <>
          <div className="mb-5 max-w-md">
            <label htmlFor="import-seller" className="mb-1 block text-sm font-medium text-neutral-900">
              Seller company
            </label>
            <select
              id="import-seller"
              value={companyId ?? ""}
              disabled={Boolean(previewId)}
              onChange={(event) => router.replace(href(Number(event.target.value) || null, null), { scroll: false })}
              className="w-full rounded-lg bg-white px-3 py-2 text-sm"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <option value="">Choose a seller company…</option>
              {sellers.map((c) => (
                <option key={c.id} value={c.id}>{c.legalName}</option>
              ))}
            </select>
            {previewId && <p className="mt-1 text-xs text-neutral-500">Start a new import to change the seller company.</p>}
          </div>
          {companyId ? (
            <ListingImportFlow
              key={companyId}
              mode="admin"
              sellerCompanyId={companyId}
              previewId={previewId}
              hrefFor={(id) => href(companyId, id)}
              editHref={(id) => `/admin/listings/LS-${id}`}
              listingsHref="/admin/listings"
            />
          ) : (
            <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">Choose the seller company the listings belong to.</p>
          )}
        </>
      )}
    </DataBoundary>
  );
}

/** Admin: import draft listings for a seller company from one spreadsheet. */
export function AdminListingImportPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <Link href="/admin/listings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="size-4" aria-hidden /> Listings
        </Link>
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Import listings from a spreadsheet</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Create draft listings for a seller company in one step, then attach SDS files and publish.
          </p>
        </div>
        <Suspense fallback={<LoadingState label="Loading import…" />}>
          <AdminImport />
        </Suspense>
      </div>
    </div>
  );
}
