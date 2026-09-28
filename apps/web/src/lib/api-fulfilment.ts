"use client";

/**
 * Fulfilment-side client: shipments, carriers, disputes, and the composed
 * buyer/seller actions that close the order loop (receipt confirmation,
 * cancel, BOL upload, dispute filing). Quotes, BOL and dispatch for order
 * shipments live in the staff-managed logistics client (`api-logistics`).
 */

import {
  confirmLogisticsReceipt,
  uploadLogisticsBol,
  type ReceiptDetails,
} from "./api-logistics";

async function proxy<T>(
  path: string,
  init?: RequestInit & { json?: Record<string, unknown> },
): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.json ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    body: init?.json ? JSON.stringify(init.json) : init?.body,
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : `Request failed with status ${response.status}`,
    );
  }
  return body as T;
}

/* ── Shipments & carriers ── */

export interface ApiShipment {
  id: number;
  originName?: string | null;
  originLatitude?: number | null;
  originLongitude?: number | null;
  destinationName?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  /** Null for pilot shipments, which hang off a pilot request instead. */
  orderId: number | null;
  /** Set when the shipment came from a buyer-agreed pilot handoff. */
  pilotRequestId?: number | null;
  carrierId: number | null;
  carrierCode: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  shipmentStatusCode: string;
  shipmentStatusName: string;
  shippingCost: number | null;
  carbonImpactKgCo2e: number | null;
  pickupScheduledAt: string | null;
  deliveryConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCarrier {
  id: number;
  code: string;
  name: string;
}

export async function fetchShipments(orderId?: number) {
  const suffix = orderId ? `?orderId=${orderId}` : "";
  const body = await proxy<{ ok: boolean; shipments: ApiShipment[] }>(
    `/api/shipments${suffix}`,
  );
  return Array.isArray(body.shipments) ? body.shipments : [];
}

export async function fetchCarriers() {
  const body = await proxy<{ ok: boolean; carriers: ApiCarrier[] }>(
    "/api/carriers",
  );
  return Array.isArray(body.carriers) ? body.carriers : [];
}

/* ── Disputes ── */

export interface ApiDispute {
  id: number;
  orderId: number | null;
  escrowId: number | null;
  shipmentId: number | null;
  openedByUserId: number;
  issueTypeCode: string;
  disputeStatusCode: string;
  summary: string;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDisputeMessage {
  id: number;
  disputeId: number;
  senderUserId: number;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

export async function fetchDisputeMessages(disputeId: number) {
  const body = await proxy<{ ok: boolean; messages: ApiDisputeMessage[] }>(
    `/api/disputes/${disputeId}/messages`,
  );
  return Array.isArray(body.messages) ? body.messages : [];
}

export async function sendDisputeMessage(disputeId: number, text: string) {
  return proxy<{ ok: boolean; message: ApiDisputeMessage }>(
    `/api/disputes/${disputeId}/messages`,
    { method: "POST", json: { body: text } },
  );
}

export async function fetchDisputes() {
  const body = await proxy<{ ok: boolean; disputes: ApiDispute[] }>(
    "/api/disputes",
  );
  return Array.isArray(body.disputes) ? body.disputes : [];
}

export async function fileDispute(input: {
  orderId: number;
  summary: string;
  issueTypeCode?: "quality" | "delivery" | "payment" | "documentation";
}) {
  const body = await proxy<{ ok: boolean; dispute: { id: number } }>(
    "/api/disputes",
    { method: "POST", json: input },
  );
  return body.dispute;
}

export async function updateDispute(
  id: number,
  patch: { disputeStatusCode?: string; resolutionNotes?: string },
) {
  return proxy(`/api/disputes/${id}`, { method: "PATCH", json: patch });
}

/* ── Composed order actions ── */

/**
 * Buyer acknowledges receipt of a delivery or pickup with the receiver's
 * name and inspection confirmation. The backend atomically records the
 * receipt, marks the shipment delivered and completes the order. It does not
 * release escrow or move funds; settlement stays with EcoGlobe staff.
 */
export async function confirmOrderDelivery(
  orderId: number,
  receipt: ReceiptDetails,
): Promise<{ escrowReleased: false }> {
  await confirmLogisticsReceipt({ orderId, ...receipt });
  return { escrowReleased: false };
}

export async function cancelOrder(orderId: number) {
  return proxy(`/api/orders/${orderId}`, {
    method: "PATCH",
    json: { orderStatusCode: "cancelled" },
  });
}

/**
 * Seller/admin attaches a Bill of Lading PDF to the scheduled shipment. The
 * file is stored privately by the backend. Uploading does not dispatch the
 * shipment or create a tracking reference; dispatch is a separate action.
 */
export async function uploadBillOfLading(input: {
  orderId: number;
  fileName: string;
  dataBase64: string;
}) {
  await uploadLogisticsBol(input);
}

/** Extract the numeric backend order id from a UI order id like "EG-5". */
export function numericOrderId(uiOrderId: string): number | null {
  const match = /^EG-(\d+)$/.exec(uiOrderId.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}
