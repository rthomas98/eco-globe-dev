"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@eco-globe/ui";
import {
  fetchOrderRefunds,
  formatRefundDate,
  formatRefundMoney,
  isRefundsUnavailable,
  type RefundRole,
} from "@/lib/api-refunds";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { RefundRequestForm } from "./refund-request-form";
import { refundBasePath, RefundPolicyNote, RefundStatusBadge } from "./refund-ui";

/**
 * Refund cases for one saved order, plus the buyer's request form when the
 * backend reports the order eligible. Eligibility fails closed: with no
 * refundable amount from Stripe, no request can be started.
 */
export function OrderRefundSection({ orderId, role }: { orderId: number; role: RefundRole }) {
  const state = useBackendData(
    () => fetchOrderRefunds(orderId),
    [orderId],
    "Refund information for this order could not be loaded.",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const unavailable = state.status === "error" && isRefundsUnavailable(state.rawError);
  const base = refundBasePath(role);

  return (
    <section className="rounded-2xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
      <h2 className="mb-4 text-lg font-bold text-neutral-900">Refunds</h2>
      {unavailable ? (
        <p className="text-sm text-neutral-600">Refund requests are not available in this environment yet.</p>
      ) : (
        <DataBoundary state={state} loadingLabel="Loading refund status…" empty={{ title: "" }}>
          {({ eligibility, refunds }) => (
            <div className="flex flex-col gap-4">
              {createdId !== null && (
                <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                  Refund request #{createdId} was recorded. EcoGlobe staff will review it; you&apos;ll get an email if
                  we need anything from you.
                </p>
              )}

              {refunds.length > 0 && (
                <ul className="flex flex-col divide-y divide-neutral-100">
                  {refunds.map((r) => (
                    <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">
                          Case #{r.id} · {formatRefundMoney(r.amountCents, r.currencyCode)}
                        </p>
                        <p className="text-xs text-neutral-500">
                          Opened {formatRefundDate(r.createdAt)}
                          {r.canRespond ? " · Your response is needed" : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <RefundStatusBadge status={r.status} />
                        <Link
                          href={`${base}/${r.id}`}
                          className="text-sm font-medium text-neutral-900 underline underline-offset-2"
                        >
                          View case
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {role === "buyer" &&
                (eligibility.eligible &&
                eligibility.activeRefundId === null &&
                eligibility.availableCents !== null &&
                eligibility.availableCents > 0 ? (
                  formOpen ? (
                    <>
                      <RefundPolicyNote role="buyer" compact />
                      <RefundRequestForm
                        orderId={orderId}
                        availableCents={eligibility.availableCents}
                        currencyCode={eligibility.currencyCode}
                        onCancel={() => setFormOpen(false)}
                        onCreated={(detail) => {
                          setCreatedId(detail.refund.id);
                          setFormOpen(false);
                          state.reload();
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-neutral-600">
                        Refundable balance: {formatRefundMoney(eligibility.availableCents, eligibility.currencyCode)}
                        {eligibility.paidCents !== null &&
                          ` of ${formatRefundMoney(eligibility.paidCents, eligibility.currencyCode)} paid`}
                        .
                      </p>
                      <div>
                        <Button type="button" variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                          Request a refund
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-neutral-600">
                    {eligibility.activeRefundId !== null
                      ? "A refund case is already open for this order. Follow it above."
                      : (eligibility.reason ?? "This order is not eligible for a refund request.")}
                  </p>
                ))}

              {role !== "buyer" && refunds.length === 0 && (
                <p className="text-sm text-neutral-600">
                  No refund cases for this order.
                  {!eligibility.eligible && eligibility.reason ? ` ${eligibility.reason}` : ""}
                </p>
              )}
            </div>
          )}
        </DataBoundary>
      )}
    </section>
  );
}
