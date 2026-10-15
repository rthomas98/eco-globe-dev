/**
 * Buyer "Request SDS" contract helpers. Pure (no aliases or browser APIs) so
 * they run under `node --test`. Types come from the backend-owned shared
 * contract; responses are validated at runtime because
 * `apiFetch<T>` does not check shapes.
 */

import type {
  ListingSdsRequestState,
  ListingSdsRequestWriteResponse,
  SdsRequestNotificationSubject,
} from "@eco-globe/shared";

export type { ListingSdsRequestState };
export type RequestedSdsState = ListingSdsRequestWriteResponse["sdsRequest"];

/** Exact subject of the seller-company in-app notification the backend writes. */
export const SDS_REQUEST_NOTIFICATION_SUBJECT: SdsRequestNotificationSubject = "SDS requested";

/** Listing ids are SQL INT identities, as the endpoint enforces. */
const MAX_SQL_INT = 2_147_483_647;

export function isPositiveListingId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_SQL_INT;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates one state for the listing that was asked for; throws on anything else. */
export function parseListingSdsRequestState(value: unknown, listingId: number): ListingSdsRequestState {
  if (!isRecord(value) || value.listingId !== listingId) {
    throw new Error("The SDS request status returned by EcoGlobe did not match this listing.");
  }
  if (value.status === "available" || value.status === "not_requested") {
    return { status: value.status, listingId };
  }
  if (
    value.status === "requested" &&
    isPositiveListingId(value.id) &&
    typeof value.requestedAt === "string" &&
    !Number.isNaN(Date.parse(value.requestedAt))
  ) {
    return { status: "requested", listingId, id: value.id, requestedAt: value.requestedAt };
  }
  throw new Error("EcoGlobe returned an SDS request status this page does not recognise.");
}

/** `GET /api/listings/:id/sds-request` body → state. */
export function parseSdsRequestGetBody(body: unknown, listingId: number): ListingSdsRequestState {
  if (!isRecord(body) || body.ok !== true) throw new Error("The SDS request status could not be read.");
  return parseListingSdsRequestState(body.sdsRequest, listingId);
}

/** `POST /api/listings/:id/sds-request` body (201 new / 200 repeat) → requested state only. */
export function parseSdsRequestPostBody(body: unknown, listingId: number): { created: boolean; sdsRequest: RequestedSdsState } {
  if (!isRecord(body) || body.ok !== true || typeof body.created !== "boolean") {
    throw new Error("EcoGlobe did not confirm the SDS request.");
  }
  const state = parseListingSdsRequestState(body.sdsRequest, listingId);
  if (state.status !== "requested") throw new Error("EcoGlobe did not confirm the SDS request.");
  return { created: body.created, sdsRequest: state };
}

interface NotificationLike {
  notificationChannelCode: string;
  relatedRecordTypeCode: string | null;
  relatedRecordId: number | null;
  notificationCategoryCode: string;
  subject: string;
}

/**
 * Listing id for a buyer SDS request alert, or null for every other
 * notification (including unrelated listing notifications).
 */
export function sdsRequestNotificationListingId(notification: NotificationLike): number | null {
  if (
    notification.notificationChannelCode === "in_app" &&
    notification.relatedRecordTypeCode === "listing" &&
    notification.notificationCategoryCode === "compliance" &&
    notification.subject === SDS_REQUEST_NOTIFICATION_SUBJECT &&
    isPositiveListingId(notification.relatedRecordId)
  ) {
    return notification.relatedRecordId;
  }
  return null;
}

/** The existing seller listing editor, scrolled to its SDS upload section. */
export function sellerSdsUploadHref(listingId: number) {
  return `/seller/listings/${listingId}/edit#sds`;
}
