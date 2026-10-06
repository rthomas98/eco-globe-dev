"use client";

import { materialImage } from "./material-images";
import { apiFetch } from "./backend-client";
import { readDemoUser } from "./demo-user";
import { listingDocumentUrl } from "./api-listing-documents";
import { parseOrderListingImageUrl } from "./order-listing-image";
import type { OrderPaymentRecord } from "./order-truth";

/**
 * Client helpers for the marketplace money path: provider-confirmed checkout
 * plus buyer/seller order reads, all via
 * the same-origin backend proxy with the session cookie.
 */

export interface ApiOrder {
  id: number;
  quoteId: number | null;
  listingId: number | null;
  listingTitle: string | null;
  /**
   * First saved listing photo (download path or legacy absolute URL), or null
   * when the listing has no photo. Never a fixture or title-based image.
   */
  listingImageUrl?: string | null;
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
  /** Saved per-unit price when the API provides it. */
  unitPrice?: number | null;
  /** Sample shipping credit deducted from totalAmount, in cents. */
  sampleShippingCreditCents?: number | null;
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

export type CheckoutStatus = "awaiting_payment" | "paid" | "expired";

export type CheckoutResult = {
  orderId: number;
  status: CheckoutStatus | string;
  payment: { provider: "stripe"; checkoutUrl: string } | null;
};

/** A checkout idempotency key: stable while one unchanged attempt is retried. */
export function newCheckoutKey() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `co-${random}`.slice(0, 100);
}

const ATTEMPT_PREFIX = "ecoglobe.checkoutAttempt:";

/** Attempt keys are scoped to the signed-in user and active company. */
function attemptStorageKey(signature: string) {
  const user = readDemoUser();
  return `${ATTEMPT_PREFIX}${user?.id ?? "anon"}:${user?.activeCompanyId ?? "none"}:${signature}`;
}

/**
 * Idempotency key for one unchanged checkout attempt, kept in sessionStorage
 * so a refresh or retry resumes the same reserved order. Only the random key
 * and the attempt signature are stored — no payment or personal data.
 */
export function checkoutAttemptKey(signature: string) {
  const storageKey = attemptStorageKey(signature);
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing && /^[a-zA-Z0-9_-]{16,100}$/.test(existing)) return existing;
    const key = newCheckoutKey();
    sessionStorage.setItem(storageKey, key);
    return key;
  } catch {
    return newCheckoutKey();
  }
}

export function clearCheckoutAttemptKey(signature: string) {
  try {
    sessionStorage.removeItem(attemptStorageKey(signature));
  } catch {
    // Storage unavailable: nothing was persisted.
  }
}

/**
 * Removes a stored attempt key by its value, for when the signature that
 * produced it is no longer known (for example a resumed pending order).
 */
export function clearCheckoutAttemptKeyValue(key: string) {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const name = sessionStorage.key(i);
      if (name?.startsWith(ATTEMPT_PREFIX) && sessionStorage.getItem(name) === key) sessionStorage.removeItem(name);
    }
  } catch {
    // Storage unavailable: nothing was persisted.
  }
}

/**
 * Starts provider-confirmed checkout. The backend prices the order, reserves
 * it and returns a Stripe Checkout URL; money is only recorded when Stripe
 * confirms payment (webhook or reconcile). The browser never records payment.
 * Throws BackendApiError (503 when online payment is not configured).
 */
export async function startCheckout(input: {
  listingId: number;
  quantity: number;
  idempotencyKey: string;
  deliveryMethod: "pickup" | "delivery";
  deliveryAddress?: string;
  pickupRequestedAt?: string;
  quoteId?: number;
}): Promise<CheckoutResult> {
  const body = await apiFetch<{ ok: true } & CheckoutResult>("/api/checkout", {
    method: "POST",
    deadlineMs: 45_000,
    body: JSON.stringify(input),
  });
  return { orderId: body.orderId, status: body.status, payment: body.payment ?? null };
}

/**
 * Buyer approval of an order waiting on buyer approval (not a Stripe checkout
 * order). Orders without escrow move to in_progress; escrow orders move to
 * escrow_required. Resolves only with the status the backend saved.
 */
export async function approveOrder(orderId: number, escrowRequired: boolean) {
  const target = escrowRequired ? "escrow_required" : "in_progress";
  await apiFetch<{ ok: true }>(`/api/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ orderStatusCode: target }),
  });
  // The PATCH response has no status code, so re-read the persisted order and
  // report only a status the backend actually saved.
  const saved = await apiFetch<{ ok: true; order?: { orderStatusCode?: string } }>(`/api/orders/${orderId}`);
  const status = saved.order?.orderStatusCode;
  if (status !== "in_progress" && status !== "escrow_required")
    throw new Error("The approval could not be confirmed. Refresh the order to check its status.");
  return status;
}

/**
 * Cancels a checkout still awaiting payment: the backend expires the Stripe
 * session and releases the reservation, returning state "expired". A paid or
 * processing checkout is refused (409) and must be refunded or reconciled.
 */
export async function cancelCheckout(orderId: number) {
  return apiFetch<{ ok: true; orderId: number; status: "expired" | "pending" | "paid" | string }>(
    `/api/checkout/${orderId}/cancel`,
    { method: "POST", body: "{}" },
  );
}

/** Confirms a returning checkout with the provider and returns the saved state. */
export async function reconcileCheckout(orderId: number) {
  return apiFetch<{ ok: true; orderId: number; status: "pending" | "paid" | "expired" | string }>(
    `/api/checkout/${orderId}/reconcile`,
    { method: "POST", body: "{}" },
  );
}

/** Saved payment records for one order (buyer, seller or admin scope). */
export async function fetchOrderPayments(orderId: number): Promise<OrderPaymentRecord[]> {
  const body = await apiFetch<{ ok: true; payments?: OrderPaymentRecord[] }>(`/api/payments?orderId=${orderId}`);
  return Array.isArray(body.payments) ? body.payments.filter((p) => p.orderId === orderId) : [];
}

/**
 * Per-unit price for an order: the saved unitPrice when present, otherwise
 * the pre-credit total divided by the ordered quantity. Null when unknown.
 */
export function orderUnitPrice(order: Pick<ApiOrder, "unitPrice" | "totalAmount" | "quantity" | "sampleShippingCreditCents">) {
  if (order.unitPrice !== undefined && order.unitPrice !== null && Number.isFinite(Number(order.unitPrice)))
    return Number(order.unitPrice);
  const quantity = Number(order.quantity);
  if (!quantity || quantity <= 0) return null;
  const total = Number(order.totalAmount) + Number(order.sampleShippingCreditCents ?? 0) / 100;
  return Math.round((total / quantity) * 100) / 100;
}

/**
 * Browser URL for the order's saved listing photo through the same-origin
 * backend proxy, or "" when there is no valid saved photo.
 */
export function orderListingImageSrc(order: Pick<ApiOrder, "listingImageUrl">) {
  const ref = parseOrderListingImageUrl(order.listingImageUrl);
  return ref ? listingDocumentUrl(ref) : "";
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
