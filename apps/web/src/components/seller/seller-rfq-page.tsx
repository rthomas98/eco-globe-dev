"use client";

import Link from "next/link";
import { useDemoUser } from "@/lib/demo-user";
import { fetchWantedListings } from "@/lib/api-portal";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { SellerLayout } from "./seller-layout";
import { BuyerRequestRow } from "./buyer-request-row";

/** Open buyer requests for quote that sellers can respond to. */
export function SellerRfqPage() {
  const companyId = useDemoUser()?.activeCompanyId;
  const requests = useBackendData(
    async () => (await fetchWantedListings()).filter((row) => row.isOpen),
    [companyId],
    "Buyer requests could not be loaded.",
  );

  return (
    <SellerLayout title="Buyer requests">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">Buyer requests</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Open requests for quote from buyers. Respond with a quote from a matching published listing; buyers see
          your response in their Requests for quote.
        </p>
      </div>
      <div className="rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
        <DataBoundary
          state={requests}
          isEmpty={(rows) => rows.length === 0}
          empty={{
            title: "No open buyer requests",
            description: "When buyers post a request for quote it appears here.",
          }}
          loadingLabel="Loading buyer requests…"
        >
          {(rows) => (
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <BuyerRequestRow key={row.id} request={row} />
              ))}
            </div>
          )}
        </DataBoundary>
        <p className="mt-4 text-xs text-neutral-500">
          Need a matching listing first?{" "}
          <Link href="/seller/listings/add" className="font-semibold text-neutral-900 underline">
            Add a listing
          </Link>
        </p>
      </div>
    </SellerLayout>
  );
}
