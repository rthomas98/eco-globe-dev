"use client";

import Link from "next/link";
import { Button } from "@eco-globe/ui";
import { fetchWantedListing } from "@/lib/api-portal";
import { useDemoUser } from "@/lib/demo-user";
import { wantedStatus } from "@/lib/wanted-listing-format";
import { ErrorState, LoadingState, useBackendData } from "@/components/shared/data-state";
import { BuyerLayout } from "./buyer-layout";
import { BuyerRfqForm } from "./buyer-rfq-form";

/** Resume one of the company's private draft requests for quote. */
export function BuyerRfqEditPage({ id }: { id: string }) {
  const companyId = useDemoUser()?.activeCompanyId;
  const numericId = /^\d+$/.test(id) ? Number(id) : null;
  const wanted = useBackendData(
    async () => (numericId === null ? null : fetchWantedListing(numericId)),
    [companyId, numericId],
    "This request could not be loaded. It may not belong to your company.",
  );

  let body: React.ReactNode;
  if (numericId === null || (wanted.status !== "loading" && wanted.status !== "error" && !wanted.data)) {
    body = <Message title="Request not found" text="No request with this id belongs to your company." />;
  } else if (wanted.status === "loading" && !wanted.data) {
    body = <LoadingState label="Loading draft…" />;
  } else if (wanted.status === "error" || !wanted.data) {
    body = (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <ErrorState message={wanted.error ?? "This request could not be loaded."} onRetry={wanted.reload} />
      </div>
    );
  } else if (wantedStatus(wanted.data) !== "draft") {
    body = (
      <Message
        title="This request is no longer a draft"
        text="Only private drafts can be edited. Submitted requests are listed under Requests for quote."
      />
    );
  } else {
    body = <BuyerRfqForm key={wanted.data.id} existing={wanted.data} />;
  }

  return <BuyerLayout>{body}</BuyerLayout>;
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center sm:px-8">
      <p className="text-lg font-bold text-neutral-900">{title}</p>
      <p className="mt-2 text-sm text-neutral-500">{text}</p>
      <Link href="/buyer/rfq" className="mt-6">
        <Button variant="primary" size="md">Back to requests for quote</Button>
      </Link>
    </div>
  );
}
