"use client";

import { materialImage } from "./material-images";

/**
 * Client helpers for the marketplace money path: direct listing checkout
 * (order → escrow funding → payment) plus buyer/seller order reads, all via
 * the same-origin backend proxy with the session cookie.
 */

export interface ApiOrder {
  id: number;
  quoteId: number | null;
  listingId: number | null;
  listingTitle: string | null;
  buyerCompanyId: number;
  buyerCompanyName: string;
  sellerCompanyId: number;
  sellerCompanyName: string;
  orderStatusCode: string;
  orderStatusName: string;
  creationSourceCode: string;
  totalAmount: number;
  currencyCode: string;
  escrowRequired: boolean;
  quantity: number | null;
  quantityUnit: string | null;
  deliveryMethod: string | null;
  deliveryAddress: string | null;
  pickupRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

class ApiOrderError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function proxyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    const message =
      typeof body.error === "string"
        ? body.error
        : "The EcoGlobe backend did not accept this request.";
    throw new ApiOrderError(message, response.status);
  }
  return body as T;
}

export async function fetchOrders(params?: {
  buyerCompanyId?: number;
  sellerCompanyId?: number;
}): Promise<ApiOrder[]> {
  const query = new URLSearchParams();
  if (params?.buyerCompanyId) query.set("buyerCompanyId", String(params.buyerCompanyId));
  if (params?.sellerCompanyId) query.set("sellerCompanyId", String(params.sellerCompanyId));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const body = await proxyFetch<{ ok: boolean; orders: ApiOrder[] }>(
    `/api/orders${suffix}`,
  );
  return Array.isArray(body.orders) ? body.orders : [];
}

export type CheckoutResult = {
  order: ApiOrder;
  escrowId?: number;
  paymentId?: number;
};

/**
 * The full direct-purchase chain against the guarded backend:
 * 1. POST /api/orders (listing_checkout — priced server-side)
 * 2. If escrow is required: create the escrow, fund it, record the payment
 * 3. Move the order to in_progress
 */
export async function placeCheckoutOrder({
  listingId,
  quantity,
  quantityUnit,
  currencyCode,
  buyerCompanyId,
  deliveryMethod,
  deliveryAddress,
  pickupRequestedAt,
}: {
  listingId: number;
  quantity: number;
  /** The listing's recorded pricing unit code (e.g. "ton", "kg"); the backend rejects a mismatch. */
  quantityUnit: string;
  /** The listing's recorded currency; the backend rejects a mismatch. */
  currencyCode: string;
  buyerCompanyId: number;
  deliveryMethod?: "pickup" | "delivery";
  deliveryAddress?: string;
  pickupRequestedAt?: string;
}): Promise<CheckoutResult> {
  const created = await proxyFetch<{ ok: boolean; order: { id: number; escrowRequired: boolean } }>(
    "/api/orders",
    {
      method: "POST",
      body: JSON.stringify({
        listingId,
        buyerCompanyId,
        quantity,
        quantityUnit,
        currencyCode: currencyCode.toUpperCase(),
        deliveryMethod,
        deliveryAddress,
        pickupRequestedAt,
        creationSourceCode: "listing_checkout",
      }),
    },
  );
  const orderId = created.order.id;
  let escrowId: number | undefined;
  let paymentId: number | undefined;

  if (created.order.escrowRequired) {
    const escrow = await proxyFetch<{ ok: boolean; escrow: { id: number } }>(
      "/api/escrows",
      { method: "POST", body: JSON.stringify({ orderId }) },
    );
    escrowId = escrow.escrow.id;

    await proxyFetch(`/api/escrows/${escrowId}`, {
      method: "PATCH",
      body: JSON.stringify({ escrowStatusCode: "funded" }),
    });

    const payment = await proxyFetch<{ ok: boolean; payment: { id: number } }>(
      "/api/payments",
      {
        method: "POST",
        body: JSON.stringify({
          orderId,
          escrowId,
          payerCompanyId: buyerCompanyId,
          paymentTypeCode: "buyer_funding",
          paymentStatusCode: "captured",
        }),
      },
    );
    paymentId = payment.payment.id;

    await proxyFetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ orderStatusCode: "in_progress" }),
    });
  }

  const finalOrder = await proxyFetch<{ ok: boolean; order: ApiOrder }>(
    `/api/orders/${orderId}`,
  );

  return { order: finalOrder.order, escrowId, paymentId };
}

export function listingImageForTitle(title: string | null) {
 return title ? materialImage(title) ?? "" : "";
}

export function formatOrderDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function formatOrderMoney(amount: number, currencyCode: string) {
  const symbol = currencyCode === "EUR" ? "€" : "$";
  return `${symbol}${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
