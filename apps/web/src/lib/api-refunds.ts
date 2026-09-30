"use client";

import { apiFetch, BackendApiError } from "./backend-client";

export {
  formatRefundMoney,
  isStripeRefundReference,
  newRefundIdempotencyKey,
  parseAmountToCents,
} from "./refund-format";

/**
 * Manual refund cases (docs/api/MANUAL_REFUNDS_CONTRACT.md).
 *
 * Staff execute every refund in Stripe. EcoGlobe records the request, the
 * decision, information requests and the verified Stripe outcome; no endpoint
 * here moves money, and the client never marks a case complete on its own.
 * Money is integer cents in the case's uppercase ISO currency.
 */

export type RefundStatus =
  | "requested"
  | "awaiting_buyer"
  | "awaiting_seller"
  | "approved"
  | "provider_pending"
  | "provider_failed"
  | "refunded"
  | "declined";

export type RefundRole = "buyer" | "seller" | "admin";

export interface RefundCase {
  id: number;
  sourceType: "order" | "sample";
  sourceId: number;
  orderId: number | null;
  sampleRequestId: number | null;
  buyerCompanyId: number;
  sellerCompanyId: number;
  buyerCompanyName: string;
  sellerCompanyName: string;
  paymentIntentId: string;
  providerRefundId: string | null;
  amountCents: number;
  paidCents: number;
  currencyCode: string;
  status: RefundStatus;
  reason: string;
  requiredAction: string | null;
  actionDueAt: string | null;
  actionVersion: number;
  createdAt: string;
  updatedAt: string;
  providerStatus: string | null;
  settlementHold: boolean;
  canRespond: boolean;
  canManage: boolean;
}

export interface RefundEvent {
  id: number;
  eventType: string;
  actorName: string | null;
  message: string;
  createdAt: string;
}

export type RefundEmailState =
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled"
  | "needs_review";

export interface RefundEmail {
  id: number;
  recipientRole: "buyer" | "seller";
  kind: "notice" | "reminder";
  state: RefundEmailState;
  attempts: number;
  lastError: string | null;
  providerEmailId: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface RefundDetail {
  ok: true;
  refund: RefundCase;
  events: RefundEvent[];
  emails: RefundEmail[];
}

export interface RefundEligibility {
  orderId: number;
  eligible: boolean;
  reason: string | null;
  paidCents: number | null;
  availableCents: number | null;
  currencyCode: string;
  activeRefundId: number | null;
  settlementHold: boolean;
}

export const REFUND_TEXT_MIN = 10;
export const REFUND_TEXT_MAX = 2000;

export async function fetchRefunds(role: RefundRole, status: "open" | "all" = "open") {
  const body = await apiFetch<{ ok: true; refunds: RefundCase[]; hasMore: boolean }>(
    `/api/refunds?role=${role}&status=${status}`,
  );
  return {
    refunds: Array.isArray(body.refunds) ? body.refunds : [],
    hasMore: Boolean(body.hasMore),
  };
}

export function fetchRefund(id: number) {
  return apiFetch<RefundDetail>(`/api/refunds/${id}`).then(normalizeDetail);
}

export async function fetchOrderRefunds(orderId: number) {
  const body = await apiFetch<{
    ok: true;
    eligibility: RefundEligibility;
    refunds: RefundCase[];
  }>(`/api/orders/${orderId}/refunds`);
  return {
    eligibility: body.eligibility,
    refunds: Array.isArray(body.refunds) ? body.refunds : [],
  };
}

export function createOrderRefund(
  orderId: number,
  input: { amountCents: number; reason: string; idempotencyKey: string },
) {
  return post(`/api/orders/${orderId}/refunds`, input);
}

export function decideRefund(id: number, decision: "approve" | "decline", note: string) {
  return post(`/api/refunds/${id}/decision`, { decision, note });
}

export function requestRefundInformation(id: number, target: "buyer" | "seller", message: string) {
  return post(`/api/refunds/${id}/request-information`, { target, message });
}

export function respondToRefund(id: number, message: string) {
  return post(`/api/refunds/${id}/respond`, { message });
}

export function reconcileRefund(id: number, refundId: string) {
  return post(`/api/refunds/${id}/reconcile`, { refundId });
}

export async function processRefundReminders() {
  const body = await apiFetch<{ ok: true; processed: number }>(
    "/api/admin/refund-reminders/process",
    { method: "POST" },
  );
  return Number(body.processed) || 0;
}

function post(path: string, payload: unknown) {
  return apiFetch<RefundDetail>(path, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeDetail);
}

function normalizeDetail(body: RefundDetail): RefundDetail {
  return {
    ...body,
    events: Array.isArray(body.events) ? body.events : [],
    emails: Array.isArray(body.emails) ? body.emails : [],
  };
}

export function isRefundsUnavailable(error: unknown) {
  return (
    error instanceof BackendApiError &&
    (error.status === 404 || error.status === 405 || error.status === 501)
  );
}

export function formatRefundDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  requested: "Awaiting staff review",
  awaiting_buyer: "Waiting on buyer",
  awaiting_seller: "Waiting on seller",
  approved: "Approved — staff refunding in Stripe",
  provider_pending: "Stripe refund pending",
  provider_failed: "Stripe refund failed",
  refunded: "Refunded (verified in Stripe)",
  declined: "Declined",
};

export const OPEN_REFUND_STATUSES: RefundStatus[] = [
  "requested",
  "awaiting_buyer",
  "awaiting_seller",
  "approved",
  "provider_pending",
  "provider_failed",
];

export function isOpenRefund(status: RefundStatus) {
  return OPEN_REFUND_STATUSES.includes(status);
}

export function refundSourceLabel(refund: Pick<RefundCase, "sourceType" | "orderId" | "sampleRequestId" | "sourceId">) {
  if (refund.sourceType === "sample")
    return `Sample shipping #${refund.sampleRequestId ?? refund.sourceId}`;
  return `Order EG-${refund.orderId ?? refund.sourceId}`;
}

export const REFUND_EMAIL_STATE_LABEL: Record<RefundEmailState, string> = {
  queued: "Queued",
  sending: "Sending",
  // Provider acceptance only; inbox delivery is never confirmed.
  sent: "Accepted by email provider",
  failed: "Failed",
  cancelled: "Cancelled",
  needs_review: "Needs staff review",
};
