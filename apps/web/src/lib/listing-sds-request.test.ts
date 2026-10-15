import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPositiveListingId,
  parseListingSdsRequestState,
  parseSdsRequestGetBody,
  parseSdsRequestPostBody,
  sdsRequestNotificationListingId,
  sellerSdsUploadHref,
  SDS_REQUEST_NOTIFICATION_SUBJECT,
} from "./listing-sds-request.ts";

const requestedAt = "2026-10-15T14:03:00.000Z";

test("listing ids must be positive SQL INT values", () => {
  assert.equal(isPositiveListingId(7), true);
  assert.equal(isPositiveListingId(2_147_483_647), true);
  for (const bad of [0, -1, 1.5, Number.NaN, 2_147_483_648, Number.MAX_SAFE_INTEGER + 1, "7", null, undefined]) {
    assert.equal(isPositiveListingId(bad), false, String(bad));
  }
});

test("each contract state parses for the requested listing", () => {
  assert.deepEqual(parseListingSdsRequestState({ status: "available", listingId: 7 }, 7), { status: "available", listingId: 7 });
  assert.deepEqual(parseListingSdsRequestState({ status: "not_requested", listingId: 7 }, 7), { status: "not_requested", listingId: 7 });
  assert.deepEqual(
    parseListingSdsRequestState({ status: "requested", listingId: 7, id: 3, requestedAt, extra: "ignored" }, 7),
    { status: "requested", listingId: 7, id: 3, requestedAt },
  );
});

test("state for another listing, unknown status or incomplete request is rejected", () => {
  assert.throws(() => parseListingSdsRequestState({ status: "not_requested", listingId: 8 }, 7));
  assert.throws(() => parseListingSdsRequestState({ status: "pending", listingId: 7 }, 7));
  assert.throws(() => parseListingSdsRequestState({ status: "requested", listingId: 7, requestedAt }, 7));
  assert.throws(() => parseListingSdsRequestState({ status: "requested", listingId: 7, id: 3, requestedAt: "not a date" }, 7));
  assert.throws(() => parseListingSdsRequestState(null, 7));
});

test("GET body requires ok:true", () => {
  assert.deepEqual(parseSdsRequestGetBody({ ok: true, sdsRequest: { status: "not_requested", listingId: 7 } }, 7), { status: "not_requested", listingId: 7 });
  assert.throws(() => parseSdsRequestGetBody({ ok: false, sdsRequest: { status: "not_requested", listingId: 7 } }, 7));
  assert.throws(() => parseSdsRequestGetBody(undefined, 7));
});

test("POST body only confirms a requested state (new 201 or repeat 200)", () => {
  const sdsRequest = { status: "requested", listingId: 7, id: 3, requestedAt };
  assert.deepEqual(parseSdsRequestPostBody({ ok: true, created: true, sdsRequest }, 7), { created: true, sdsRequest });
  assert.deepEqual(parseSdsRequestPostBody({ ok: true, created: false, sdsRequest }, 7), { created: false, sdsRequest });
  assert.throws(() => parseSdsRequestPostBody({ ok: true, created: true, sdsRequest: { status: "not_requested", listingId: 7 } }, 7));
  assert.throws(() => parseSdsRequestPostBody({ ok: true, sdsRequest }, 7));
  assert.throws(() => parseSdsRequestPostBody({ ok: true, created: true }, 7));
});

test("only the exact SDS request alert links to the listing SDS upload", () => {
  const alert = { notificationChannelCode: "in_app", relatedRecordTypeCode: "listing", relatedRecordId: 42, notificationCategoryCode: "compliance", subject: SDS_REQUEST_NOTIFICATION_SUBJECT };
  assert.equal(sdsRequestNotificationListingId(alert), 42);
  assert.equal(sellerSdsUploadHref(42), "/seller/listings/42/edit#sds");
  assert.equal(sdsRequestNotificationListingId({ ...alert, subject: "Listing approved" }), null);
  assert.equal(sdsRequestNotificationListingId({ ...alert, subject: "SDS requested again" }), null);
  assert.equal(sdsRequestNotificationListingId({ ...alert, notificationCategoryCode: "marketplace" }), null);
  assert.equal(sdsRequestNotificationListingId({ ...alert, relatedRecordTypeCode: "order" }), null);
  assert.equal(sdsRequestNotificationListingId({ ...alert, relatedRecordId: null }), null);
  assert.equal(sdsRequestNotificationListingId({ ...alert, relatedRecordId: 0 }), null);
  assert.equal(sdsRequestNotificationListingId({ ...alert, notificationChannelCode: "email" }), null);
  assert.equal(sdsRequestNotificationListingId({ ...alert, notificationChannelCode: "sms" }), null);
});
