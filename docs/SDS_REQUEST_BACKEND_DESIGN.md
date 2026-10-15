# Buyer SDS request contract

Design for base `9d3937390cb8de8e7d10d80dfc739d301d997e9f`. Coordinator approved the contract after independent frontend review on 2026-10-15; lifetime company/listing dedupe is accepted.

## Problem and existing behavior

An authenticated buyer needs to ask the seller for an SDS on a published listing without usable SDS content. The request must survive reloads and concurrent retries, notify the actual seller company in-app, and never send email.

`listing-routes.ts` owns listing projection, document upload, and deletion. Public catalogue reads require published status and seller verification status other than inactive. Authenticated company members receive usable documents. Upload and deletion lock the listing row inside a transaction. Upload moves a published listing to pending review. Deleting the last SDS moves a published or pending listing to draft.

`listing-safety.ts` defines usable content as nonempty inline bytes or a nonblank legacy FileUrl on a nondeleted document with DocumentTypes.Code `sds`. Checkout and RFQ call `requireListingSds`. This feature reuses that SQL predicate and leaves those guards unchanged.

`auth.ts` validates bearer sessions, active membership, and authorized roles. `AuthContext` carries userId, companyId, and isAdmin, but no buyer role. The new request operation must query current active membership and company type buyer or both. It rejects inactive or suspended buyer companies, missing company context, and the seller's own company. It requires no transaction execution permission because this request creates no purchase or quote. Admin status does not bypass buyer checks.

`api.ts` lists notifications visible to the session user or active company. Notifications support a company recipient with UserId NULL. Its `notifyCompanies` helper swallows errors and is unsuitable for this feature. Generic notification creation also cannot supply the dedupe invariant. `lab-routes.ts` has transaction-aware in-app company notification inserts, but their INSERT SELECT can insert zero rows if a lookup is missing. The new operation must detect that case and roll back.

## Caller usage

The buyer loads `GET /api/listings/22/sds-request` with a bearer session and receives `{ok:true,sdsRequest:{status:"not_requested",listingId:22}}` when eligible and not previously requested. The ID is illustrative routing syntax, not fixture business data.

The buyer submits `POST /api/listings/22/sds-request` with `{}` or no body. The first request receives 201 and `{ok:true,created:true,sdsRequest:{status:"requested",listingId:22,id:requestId,requestedAt:isoTimestamp}}`. A repeat by any member of the same buyer company receives 200, created false, and the original request ID and timestamp. No caller-supplied company ID, user ID, recipient, subject, or body is accepted.

The seller uses existing `GET /api/notifications`. The saved alert has `relatedRecordTypeCode:"listing"`, `relatedRecordId:listingId`, `notificationChannelCode:"in_app"`, category `compliance`, and subject `SDS requested`. The frontend matches in_app, compliance, listing, and the exact shared literal subject `SDS requested`, then maps that alert to **Upload SDS** at `/seller/listings/:id/edit#sds`. The body includes the persisted listing title and ID. Existing seller ownership and upload permission checks remain authoritative.

## Types and signatures

Defined in `packages/shared/src/listing-sds-api.d.ts`, re-exported as types through `listing-api.ts` and the shared index:

```ts
export type ListingSdsRequestState =
	| { status: "available"; listingId: number }
	| { status: "not_requested"; listingId: number }
	| { status: "requested"; listingId: number; id: number; requestedAt: string };
export type ListingSdsRequestResponse = { ok: true; sdsRequest: ListingSdsRequestState };
export type ListingSdsRequestWriteResponse = {
	ok: true;
	created: boolean;
	sdsRequest: Extract<ListingSdsRequestState, { status: "requested" }>;
};
```

The API returns 401 for invalid authentication, 403 for an ineligible buyer company or self-request, 404 for absent or nonpublic listings, 400 for invalid IDs or nonempty bodies, and 409 on POST if usable seller SDS now exists. GET gives `available` precedence over a historical request. After seller upload, the existing pending-review transition may cause buyer reads to return 404 until republished. The frontend must refresh the listing after conflicts and handle loss of visibility without inventing a completed request.

`handleListingSdsRequestRoute(request, response, url): Promise<boolean>` owns HTTP validation and bearer authentication. `readListingSdsRequest(auth, listingId)` and `createListingSdsRequest(auth, listingId)` own database policy and return the shared state. All buyer/request identity comes from the validated session. The HTTP interface hides locking, notification lookups, persistence, and dedupe from callers.

## State, modules, and transaction

Add `dbo.ListingSdsRequests` through additive, repeatable migration `20261015_listing_sds_requests.sql`. Columns: Id INT identity primary key, ListingId FK, BuyerCompanyId FK, RequestedByUserId FK, NotificationId FK NOT NULL UNIQUE, RequestedAt DATETIME2 default UTC. Add UNIQUE(ListingId,BuyerCompanyId). Store no mutable fulfilled/read state: current SDS availability derives from ListingDocuments, while notification read state remains independent.

One lifetime request per buyer company and listing is the accepted scope. Upload followed by later SDS deletion does not create another request or another alert. Changing that product rule later requires an explicit generation or resolution model.

`listing-sds-requests.ts` owns the route and transactional store. `listing-routes.ts` dispatches the specific path before its general listing handler. `listing-safety.ts` remains the source of the usable-document SQL expression. `listing-sds-api.d.ts` owns shared transport types and the notification subject literal type. The migration owns only the new table and indexes.

For POST, acquire the listing UPDLOCK/HOLDLOCK first, matching document writers. Within the transaction validate visibility, seller identity, current buyer membership/company eligibility, self-request prohibition, and current SDS content. Read the existing request under the same serialized listing lock. If absent, insert exactly one in-app company notification using the persisted seller company with UserId NULL, then insert the request linked to that notification. Lookup absence or zero inserted notification rows throws. The transaction commits both rows together or rolls back both, so retries after response loss return the original record. The unique constraint backs the locking invariant. No email or external-provider code participates.

GET uses the same eligibility and visibility rules and current usable-SDS detection. It reads only the session's buyer-company request, never another tenant's request or requester identity.

## Alternatives and decision

Dedicated table is recommended because it makes buyer-company identity, lifetime dedupe, requester attribution, and notification linkage relational invariants. It adds one migration and a small store while preserving the existing notification read contract.

Reusing Notifications would avoid a table but has no buyer-company column or request kind. CreatedByUserId dedupes users instead of companies. Subject/body matching makes correctness depend on display text, and read status cannot represent request fulfillment. Adding typed source-company and dedupe columns with filtered indexes would migrate a generic table and expose more policy than the dedicated design.

An in-memory request cache cannot survive restarts or coordinate processes and is rejected. Separate request/notification commits or best-effort notifications can report success without a seller alert and are rejected.

We accept one additive table and serialization per listing for reliable retries and upload races. We accept existing company-wide notification visibility so no arbitrary seller member must be selected. Seller actions still enforce existing seller-operator authorization.

## Verification and review

Focused tests cover route/body/ID validation, current buyer and company restrictions, hidden listings, usable versus empty/deleted SDS rows, retry dedupe, tenant isolation, notification failure propagation, and unchanged checkout/RFQ guards. SQL integration must exercise real concurrent POSTs, atomic rollback on notification failure, current SDS races, and repeat migration without resetting existing data.

The coordinator runs SQL from the original owned local runtime without copying credentials or adopting its receipt. A smoke executable takes sanitized externally supplied connection configuration and creates only uniquely labeled local test fixtures. Browser/live verification remains coordinator-owned. Record the exact final diff, SHA-256 hashes, tests, and reciprocal review verdict before completion.

Contract approval is complete. Final acceptance still requires exact-diff reciprocal review and coordinator verification. The SQL smoke uses restricted app credentials; the coordinator installs and removes the uniquely scoped rollback probe through the original owner DDL channel. No SDS file is fabricated: current usable-SDS route conflicts have driver coverage and the canonical predicate has a real SQL derived-value check.
