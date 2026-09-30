"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { portalMoney } from "@/lib/api-portal";
import {
  fetchPaymentExceptions,
  isPaymentExceptionsUnavailable,
} from "@/lib/api-payment-exceptions";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

function when(value: string | null) {
  return value ? new Date(value).toLocaleString("en-US") : "—";
}

/** Read-only list of checkout payment exceptions that need review in Stripe. */
export function AdminPaymentExceptionsPage() {
  const [status, setStatus] = useState<"open" | "all">("open");
  const exceptions = useBackendData(
    () => fetchPaymentExceptions(status),
    [status],
    "Payment exceptions could not be loaded.",
  );
  const unavailable =
    exceptions.status === "error" && isPaymentExceptionsUnavailable(exceptions.rawError);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Payment exceptions</h1>
            <p className="mt-1 max-w-3xl text-sm text-neutral-500">
              Checkout payments the backend could not reconcile automatically, such as a payment
              confirmed after the order reservation was released.
            </p>
          </div>
          <div className="flex rounded-full bg-neutral-100 p-1" role="group" aria-label="Exception status">
            {(["open", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
                  status === s ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
                }`}
              >
                {s === "open" ? "Open" : "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5 flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Investigate in Stripe using the Checkout session ID. Any refund must be handled through
            the approved finance process and tracked as a{" "}
            <Link href="/admin/refunds" className="font-semibold underline underline-offset-2">
              refund case
            </Link>
            . This page is read-only; completing a refund does not automatically close this exception.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          {unavailable ? (
            <p className="px-6 py-12 text-center text-sm text-neutral-600">
              Payment exception reporting is not available in this environment yet.
            </p>
          ) : (
            <DataBoundary
              state={exceptions}
              loadingLabel="Loading payment exceptions…"
              isEmpty={(data) => data.exceptions.length === 0}
              empty={{
                title: status === "open" ? "No open payment exceptions" : "No payment exceptions recorded",
              }}
            >
              {(data) => (
                <>
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                      <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500" style={{ borderBottom: "1px solid #F0F0F0" }}>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Recorded</th>
                        <th className="px-5 py-3">Order</th>
                        <th className="px-5 py-3">Buyer / seller</th>
                        <th className="px-5 py-3">Order amount</th>
                        <th className="px-5 py-3">Reason</th>
                        <th className="px-5 py-3">Provider reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.exceptions.map((e) => (
                        <tr key={e.id} style={{ borderBottom: "1px solid #F8F8F8" }} className="align-top">
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                e.resolvedAt ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                              }`}
                            >
                              {e.resolvedAt ? "Resolved" : "Open"}
                            </span>
                            {e.resolvedAt && (
                              <span className="mt-1 block text-xs text-neutral-500">{when(e.resolvedAt)}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-neutral-700">{when(e.createdAt)}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-neutral-900">EG-{e.orderId}</td>
                          <td className="px-5 py-3.5 text-neutral-700">
                            {e.buyerCompanyName}
                            <span className="block text-xs text-neutral-500">Seller: {e.sellerCompanyName}</span>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-neutral-900">
                            {portalMoney(Number(e.totalAmount), e.currencyCode)}
                          </td>
                          <td className="max-w-[280px] px-5 py-3.5 text-neutral-700">{e.reason}</td>
                          <td className="px-5 py-3.5 font-mono text-xs break-all text-neutral-700">{e.providerSessionId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.hasMore && (
                    <p className="px-5 py-3 text-xs text-neutral-500">
                      Showing the latest 500 exceptions. Older records are not listed here.
                    </p>
                  )}
                </>
              )}
            </DataBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
