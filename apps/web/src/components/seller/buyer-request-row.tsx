"use client";

import { useState } from "react";
import { portalMoney, type ApiWantedListing } from "@/lib/api-portal";
import { describeWantedQuantity, describeWantedTargetPrice } from "@/lib/wanted-listing-format";
import { RfqRespondForm } from "./rfq-respond-form";

/** One open buyer request with an inline quote response form. */
export function BuyerRequestRow({ request }: { request: ApiWantedListing }) {
  const [responding, setResponding] = useState(false);
  const place = [request.stateProvince, request.countryCode].filter(Boolean).join(", ");
  const target =
    request.targetPricePerUnit != null && request.currencyCode
      ? portalMoney(request.targetPricePerUnit, request.currencyCode)
      : request.targetPricePerUnit != null
        ? describeWantedTargetPrice(request)
        : null;
  return (
    <div className="rounded-lg bg-neutral-50 px-4 py-3 text-sm" style={{ border: "1px solid #F0F0F0" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-neutral-900">{request.title}</span>
        <span className="text-neutral-600">
          {describeWantedQuantity(request)} · {request.materialTypeName}
          {place && ` · ${place}`}
          {target && ` · target ${target}`}
        </span>
        {!responding && (
          <button
            type="button"
            onClick={() => setResponding(true)}
            className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white"
          >
            Respond with a quote
          </button>
        )}
      </div>
      {request.notes && <p className="mt-1 text-xs text-neutral-600">{request.notes}</p>}
      {responding && <RfqRespondForm wanted={request} onClose={() => setResponding(false)} />}
    </div>
  );
}
