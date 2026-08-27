"use client";

import { useEffect, useState } from "react";
import {
  fetchEscrows,
  portalDate,
  type ApiEscrowRecord,
} from "@/lib/api-portal";
import { fetchOrders, type ApiOrder } from "@/lib/api-orders";
import { readDemoUser } from "@/lib/demo-user";
import {
  escrowRecords,
  type EscrowLifecycleStatus,
  type EscrowRecord,
} from "./escrow-demo-data";

const STATUS_BY_CODE: Record<string, EscrowLifecycleStatus> = {
  not_required: "Held in escrow",
  funding_required: "Awaiting funding",
  funded: "Held in escrow",
  release_pending: "Ready to release",
  released: "Released",
  dispute_locked: "Disputed",
};

const RELEASE_TRIGGER_BY_RULE: Record<string, string> = {
  delivery_confirmation: "Released after delivery confirmation",
  admin_approval: "Released by EcoGlobe admin approval",
  contract_milestone: "Released on contract milestone",
};

function mapLiveEscrow(
  escrow: ApiEscrowRecord,
  order: ApiOrder | undefined,
): EscrowRecord {
  const status = STATUS_BY_CODE[escrow.escrowStatusCode] ?? "Held in escrow";
  const platformFee = Math.round(Number(escrow.amount) * 0.03 * 100) / 100;
  return {
    id: `ESC-${escrow.id}`,
    orderId: `EG-${escrow.orderId}`,
    transactionId: `TX-${escrow.orderId}`,
    provider: "Stripe Connect Manual Transfer",
    providerReference: escrow.providerEscrowId ?? `ECO-${escrow.id}`,
    buyer: order?.buyerCompanyName ?? "Marketplace buyer",
    seller: order?.sellerCompanyName ?? "Marketplace seller",
    product: order?.listingTitle ?? "Marketplace order",
    amount: Number(escrow.amount),
    amountHeld: status === "Released" ? 0 : Number(escrow.amount),
    platformFee,
    sellerPayout: Number(escrow.amount) - platformFee,
    currency: "USD",
    status,
    fundedDate: portalDate(escrow.updatedAt),
    orderDate: portalDate(escrow.createdAt),
    estimatedDelivery: "—",
    releaseDate: status === "Released" ? portalDate(escrow.updatedAt) : "—",
    releaseTrigger:
      RELEASE_TRIGGER_BY_RULE[escrow.releaseRuleCode] ?? "Manual release",
    automatedTrigger:
      RELEASE_TRIGGER_BY_RULE[escrow.releaseRuleCode] ?? "Manual release",
    inspectionWindow: "48 hours after delivery",
    shippingType: "Delivery",
    disputeReason: escrow.disputeLocked ? "Dispute opened by a party" : undefined,
    buyerNextStep:
      status === "Awaiting funding"
        ? "Fund the escrow to start fulfilment."
        : status === "Ready to release"
          ? "Confirm delivery to release funds."
          : "No action needed.",
    sellerNextStep:
      status === "Held in escrow"
        ? "Fulfil the order and confirm delivery."
        : "No action needed.",
    adminNextStep:
      status === "Disputed" ? "Review the dispute and unlock." : "Monitor.",
    documents: [],
    activity: [
      { label: "Escrow created", date: portalDate(escrow.createdAt), complete: true },
      {
        label: "Funds held",
        date: status === "Awaiting funding" ? undefined : portalDate(escrow.updatedAt),
        complete: status !== "Awaiting funding",
      },
      {
        label: "Funds released",
        date: status === "Released" ? portalDate(escrow.updatedAt) : undefined,
        complete: status === "Released",
      },
    ],
  };
}

/**
 * Live escrows for the signed-in company (all escrows for admins), merged
 * ahead of the curated demo records.
 */
export function useEscrowRecords(): EscrowRecord[] {
  const [records, setRecords] = useState<EscrowRecord[]>(escrowRecords);

  useEffect(() => {
    if (!readDemoUser()) return;
    let cancelled = false;
    Promise.all([fetchEscrows(), fetchOrders()])
      .then(([escrows, orders]) => {
        if (cancelled || escrows.length === 0) return;
        const orderById = new Map(orders.map((order) => [order.id, order]));
        const live = escrows.map((escrow) =>
          mapLiveEscrow(escrow, orderById.get(escrow.orderId)),
        );
        setRecords([...live, ...escrowRecords]);
      })
      .catch(() => {
        // Demo records remain when the backend is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return records;
}
