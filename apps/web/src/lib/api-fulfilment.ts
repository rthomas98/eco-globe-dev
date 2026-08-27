"use client";

/**
 * Fulfilment-side client: shipments, carriers, disputes, and the composed
 * buyer/seller actions that close the order loop (confirm delivery, cancel,
 * shipping quotes, BOL upload, dispute filing).
 */

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
  orderId: number;
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

export async function createShipment(input: {
  orderId: number;
  carrierCode?: string;
  shipmentStatusCode?: string;
  trackingNumber?: string;
  shippingCost?: number;
  pickupScheduledAt?: string;
}) {
  const body = await proxy<{ ok: boolean; shipment: { id: number } }>(
    "/api/shipments",
    { method: "POST", json: input },
  );
  return body.shipment;
}

export async function updateShipment(
  id: number,
  patch: {
    shipmentStatusCode?: string;
    trackingNumber?: string;
    shippingCost?: number;
    deliveryConfirmedAt?: string;
  },
) {
  return proxy(`/api/shipments/${id}`, { method: "PATCH", json: patch });
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
 * Buyer confirms delivery: mark the shipment delivered (creating one for
 * pickup orders that never had a shipment record), release the escrow when
 * one is funded, and complete the order.
 */
export async function confirmOrderDelivery(orderId: number) {
  const shipments = await fetchShipments(orderId);
  const openShipment = shipments.find(
    (s) => s.shipmentStatusCode !== "delivered",
  );
  if (openShipment) {
    await updateShipment(openShipment.id, {
      shipmentStatusCode: "delivered",
      deliveryConfirmedAt: new Date().toISOString(),
    });
  } else if (shipments.length === 0) {
    await createShipment({
      orderId,
      carrierCode: "ecofreight",
      shipmentStatusCode: "delivered",
    });
  }

  const escrows = await proxy<{
    ok: boolean;
    escrows: Array<{ id: number; escrowStatusCode: string }>;
  }>(`/api/escrows?orderId=${orderId}`);
  const releasable = (escrows.escrows ?? []).find((e) =>
    ["funded", "release_pending"].includes(e.escrowStatusCode),
  );
  if (releasable) {
    await proxy(`/api/escrows/${releasable.id}`, {
      method: "PATCH",
      json: { escrowStatusCode: "released" },
    });
  }

  await proxy(`/api/orders/${orderId}`, {
    method: "PATCH",
    json: { orderStatusCode: "completed" },
  });

  return { escrowReleased: Boolean(releasable) };
}

export async function cancelOrder(orderId: number) {
  return proxy(`/api/orders/${orderId}`, {
    method: "PATCH",
    json: { orderStatusCode: "cancelled" },
  });
}

/** Seller sends a shipping quote: a scheduled shipment carrying the cost. */
export async function sendShippingQuote(input: {
  orderId: number;
  carrierCode: string;
  shippingCost: number;
  pickupScheduledAt?: string;
}) {
  return createShipment({
    ...input,
    shipmentStatusCode: "quote_pending",
  });
}

/**
 * Seller uploads a Bill of Lading: the file goes to blob storage and the
 * order's shipment moves to in_transit with the tracking reference.
 */
export async function uploadBillOfLading(input: {
  orderId: number;
  fileName: string;
  contentType: string;
  dataBase64: string;
  trackingNumber?: string;
}) {
  const uploaded = await proxy<{ ok: boolean; file: { url: string } }>(
    "/api/files",
    {
      method: "POST",
      json: {
        fileName: input.fileName,
        contentType: input.contentType,
        dataBase64: input.dataBase64,
      },
    },
  );

  const shipments = await fetchShipments(input.orderId);
  const target = shipments.find((s) => s.shipmentStatusCode !== "delivered");
  if (target) {
    await updateShipment(target.id, {
      shipmentStatusCode: "in_transit",
      trackingNumber: input.trackingNumber ?? uploaded.file.url.slice(-24),
    });
  } else {
    await createShipment({
      orderId: input.orderId,
      carrierCode: "ecofreight",
      shipmentStatusCode: "in_transit",
      trackingNumber: input.trackingNumber,
    });
  }

  return uploaded.file;
}

/** Extract the numeric backend order id from a UI order id like "EG-5". */
export function numericOrderId(uiOrderId: string): number | null {
  const match = /^EG-(\d+)$/.exec(uiOrderId.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}
