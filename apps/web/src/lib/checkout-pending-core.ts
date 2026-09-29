/**
 * Pure, dependency-free parts of the pending-checkout store: entry shapes,
 * validation and the user/company scope key. Unit tested directly.
 */

export interface PendingCheckoutRequest {
  listingId: number;
  quantity: number;
  idempotencyKey: string;
  deliveryMethod: "pickup" | "delivery";
  deliveryAddress?: string;
  pickupRequestedAt?: string;
}

export interface PendingCheckout {
  /** Cart item id (backend listing id as string). */
  cartItemId: string;
  orderId: number;
  request: PendingCheckoutRequest;
  createdAt: number;
}

export const PENDING_KEY_PREFIX = "ecoglobe.pendingCheckouts:";

/** Storage key for one user within one active company; null when unscoped. */
export function pendingScopeKey(userId: number | undefined, companyId: number | undefined): string | null {
  if (!userId || !companyId) return null;
  return `${PENDING_KEY_PREFIX}${userId}:${companyId}`;
}

export function isPendingRequest(value: unknown): value is PendingCheckoutRequest {
  const r = value as Record<string, unknown> | null;
  return (
    !!r &&
    typeof r === "object" &&
    Number.isSafeInteger(r.listingId) &&
    typeof r.quantity === "number" &&
    Number.isFinite(r.quantity) &&
    r.quantity > 0 &&
    typeof r.idempotencyKey === "string" &&
    /^[a-zA-Z0-9_-]{16,100}$/.test(r.idempotencyKey) &&
    (r.deliveryMethod === "pickup" || r.deliveryMethod === "delivery") &&
    (r.deliveryAddress === undefined || typeof r.deliveryAddress === "string") &&
    (r.pickupRequestedAt === undefined || typeof r.pickupRequestedAt === "string")
  );
}

export function isPendingEntry(value: unknown): value is PendingCheckout {
  const e = value as Record<string, unknown> | null;
  return (
    !!e &&
    typeof e === "object" &&
    typeof e.cartItemId === "string" &&
    Number.isSafeInteger(e.orderId) &&
    Number(e.orderId) > 0 &&
    typeof e.createdAt === "number" &&
    isPendingRequest(e.request) &&
    String((e.request as PendingCheckoutRequest).listingId) === e.cartItemId
  );
}

/** Keeps only well-formed entries stored under their own cart item id. */
export function validPendingEntries(parsed: unknown): Record<string, PendingCheckout> {
  if (!parsed || typeof parsed !== "object") return {};
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter(
      (pair): pair is [string, PendingCheckout] => isPendingEntry(pair[1]) && pair[1].cartItemId === pair[0],
    ),
  );
}
