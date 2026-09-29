"use client";

import { apiFetch, BackendApiError } from "./backend-client";

/**
 * Checkout payment exceptions recorded by the backend (for example a Stripe
 * payment confirmed after the order reservation was released). Read-only:
 * investigate in Stripe by Checkout session ID; refunds follow the approved
 * finance process, and ResolvedAt does not synchronize from Stripe.
 */
export interface PaymentException {
  id: number;
  orderId: number;
  providerSessionId: string;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
  buyerCompanyName: string;
  sellerCompanyName: string;
  totalAmount: number;
  currencyCode: string;
}

export async function fetchPaymentExceptions(status: "open" | "all" = "open") {
  const body = await apiFetch<{ ok: true; exceptions: PaymentException[]; hasMore: boolean }>(
    `/api/admin/payment-exceptions${status === "all" ? "?status=all" : ""}`,
  );
  return {
    exceptions: Array.isArray(body.exceptions) ? body.exceptions : [],
    hasMore: Boolean(body.hasMore),
  };
}

export function isPaymentExceptionsUnavailable(error: unknown) {
  return error instanceof BackendApiError && (error.status === 404 || error.status === 405 || error.status === 501);
}
