# FUEL private draft backend design

Design proposal against `8fc484ba5407b134743475d2fc25605d2183d6bb`. Implementation requires coordinator GO. This document records source inspection, not database or browser proof.

## Problem and decision

Seller drafts already allow null quantity, MOQ, and price, but `Listings.LocationId` and the save route require a facility. Buyer `WantedListings` require quantity and country and post immediately. Preserve unknown source values as SQL NULL and keep drafts private to their owning company and admins.

Extend `WantedListings` with `IsDraft` and derive its API status. This preserves IDs, quote foreign keys, accepted-request closure, and the existing buyer-company ownership boundary. Do not add a second status column to synchronize with `IsOpen`.

Zentech has source quantity 20 metric tonnes (`quantity:20`, `quantityUnit:"tonne"`). Other unknown volumes, prices, and SDS remain absent. The coordinator owns mapping, provisioning, and live proof. This feature adds no demo records or fixture prices to shared SQL.

## Caller usage

Seller save uses the existing API:

```ts
// POST /api/listings. Subsequent edits use PATCH /api/listings/:id.
{ sellerCompanyId, title, materialTypeCode, listingStatusCode: "draft",
  locationId: null, quantity: null, quantityUnit: null,
  minimumOrderQuantity: null, pricePerUnit: null, currencyCode: null }
// Read after save: GET /api/listings/:id?scope=owned.
```

Buyer create, resume, and publish use one request ID:

```ts
// POST /api/wanted-listings -> 201 {ok:true,wantedListing}
{ title, materialTypeCode, statusCode: "draft" }
// GET /api/wanted-listings/:id -> 200 {ok:true,wantedListing}
// PATCH /api/wanted-listings/:id -> 200 {ok:true,wantedListing}
{ notes: "Source notes", targetPricePerUnit: null }
// PATCH the same ID to publish. No new need-by requirement.
{ statusCode: "open", quantity: 20, quantityUnit: "tonne",
  currencyCode: "USD", countryCode: "US", needByDate: null }
```

The last example demonstrates validation only. It is not authority to assign currency, country, or volume to a source record.

## Shared frontend contract

Backend owns `packages/shared/src/wanted-listing-api.d.ts`, re-exported by `src/index.ts`, and changes the existing `listing-api.ts`. The following declarations describe the proposed surface:

```ts
export type WantedListingStatusCode = "draft" | "open" | "closed";
export type WantedListingFields = {
	title: string;
	materialTypeCode: string;
	quantity: number | null;
	quantityUnit: string | null;
	targetPricePerUnit: number | null;
	currencyCode: string | null;
	countryCode: string | null;
	stateProvince: string | null;
	notes: string | null;
	needByDate: string | null; // YYYY-MM-DD, never a timestamp
};
export type WantedListingDraftWrite = Pick<WantedListingFields,
	"title" | "materialTypeCode"> & Partial<Omit<WantedListingFields,
	"title" | "materialTypeCode">> & { statusCode: "draft" };
export type WantedListingOpenWrite = Omit<WantedListingDraftWrite,
	"statusCode" | "quantity" | "countryCode"> & {
	statusCode?: "open"; // omission preserves the existing create behavior
	quantity: number;
	countryCode: string;
};
export type WantedListingWrite = WantedListingDraftWrite | WantedListingOpenWrite;
export type WantedListingPatch = Partial<WantedListingFields> & {
	statusCode?: WantedListingStatusCode;
	isOpen?: boolean; // compatibility for existing open/closed clients
};
export type PersistedWantedListing = WantedListingFields & {
	id: number;
	buyerCompanyId: number | null; // existing public anonymity
	buyerCompanyName: string | null;
	materialTypeName: string;
	statusCode: WantedListingStatusCode;
	isOpen: boolean;
	createdAt: string;
	responseCount: number;
	acceptedCount: number;
};
```

`ListingWrite.locationId` becomes optional `number | null`. `ListingWrite.quantityUnit` and `currencyCode` accept null. Persisted seller `quantityUnit` and `currencyCode` also become nullable. Other seller read fields already model nullable location and numeric values.

Responses retain `{ok:true,wantedListings:[...]}` and `{ok:true,wantedListing:{...}}`. Return a full persisted projection after writes. No SQL-only `IsDraft` property is required in the wire contract. Recurrence and description remain in `notes`; do not parse old notes into invented structured dates.

## Routes, validation, and transitions

| Route | Behavior |
| --- | --- |
| GET `/api/wanted-listings` | Public/seller demand: `IsDraft=0`, `IsOpen=1`, no accepted quote; retain buyer anonymity. |
| GET `/api/wanted-listings?mine=true` | Requires active company; returns only that company's draft/open/closed rows. Admin must still select an active company for this existing scope. |
| GET `/api/wanted-listings/:id` | New authenticated own-company/admin read; 404 for missing or another tenant. Private, no-store. |
| POST `/api/wanted-listings` | Only `draft` or `open`; missing status takes the legacy open path. Company comes from auth, never body. |
| PATCH `/api/wanted-listings/:id` | Own-company/admin transaction. Merge fields by property presence; explicit null clears nullable fields and omission preserves them. |
| GET/POST `/api/wanted-listings/:id/responses` | Other tenants cannot inspect draft existence or metadata; reject draft before returning responses. POST rechecks under parent lock. |

Draft create requires trimmed title (1..200) and a valid material type code. Optional numeric values must be finite JSON numbers, within DECIMAL bounds and scale (quantity three, target price two), and positive quantity or nonnegative target price when present. Optional strings must fit SQL widths. Unit aliases follow `quantity-units.ts`; country is two letters, currency three letters, normalized uppercase. Date must be a real round-tripping calendar date in YYYY-MM-DD format. Reject arrays, unknown fields, coerced numeric strings, unknown statuses, and conflicting `statusCode`/`isOpen` combinations.

Draft omission/null/blank optional text means NULL. Normalize blank numeric form fields to NULL at the frontend; reject numeric strings at the API. Seller's existing blank numeric handling remains compatible. Title/material cannot be cleared. No default price, volume, unit, currency, country, location, or document for drafts.

For legacy POST-open only, retain omitted unit `tons` and currency `USD`. Do not apply these defaults when publishing a saved draft. Draft-to-open validates the merged row: positive quantity, nonblank supported unit, currency, and country. Target price and need-by remain optional. No new required date for legacy callers.

Transitions: draft may save draft or publish open. Draft cannot close through `isOpen:false`; callers must use explicit `statusCode` for draft transitions. Non-draft may remain open, close, or reopen under the existing accepted-quote guard. Non-draft cannot become draft. An accepted request projects closed and cannot reopen, including through unrelated PATCH payloads. Preserve existing non-draft PATCH behavior and prevent nulling required commercial fields. Conflicting fields are 400, invalid transitions 409, tenant reads/writes 404, invalid active-company context 403.

Seller draft may omit or clear its pickup facility. A supplied facility must be valid and owned by the seller. All submission (`pending_review`) and admin publication checks stay strict: owned valid facility, positive quantity/MOQ, saved price, unit/currency, and usable SDS. Preserve the existing allowance for zero seller price and existing SDS checks. Ordinary sellers cannot publish directly. Closing/deleting a locationless draft must still work without inventing a facility; closed records remain undiscoverable and cannot submit until valid.

## Migration and state ownership

Add `20261016_private_drafts.sql`, after the existing listing-content migration:

- Alter seller `LocationId`, `QuantityUnit`, and `CurrencyCode` to nullable, preserving foreign keys and defaults for unrelated SQL callers. Route writes pass explicit NULL for draft blanks so defaults do not fabricate values.
- Add wanted `IsDraft BIT NOT NULL DEFAULT(0) WITH VALUES` and `NeedByDate DATE NULL`. Existing requests remain non-draft and dates remain NULL.
- Alter wanted `Quantity DECIMAL(18,3)`, `QuantityUnit VARCHAR(40)`, `CurrencyCode CHAR(3)`, and `CountryCode CHAR(2)` to nullable.
- CHECK `IsDraft=0 OR IsOpen=0` and CHECK `IsDraft=1 OR (Quantity IS NOT NULL AND QuantityUnit IS NOT NULL AND CurrencyCode IS NOT NULL AND CountryCode IS NOT NULL)`. Use explicit IS NOT NULL because SQL CHECK treats UNKNOWN as success.
- Preserve all current rows, IDs, quote relationships, and original non-draft nullability invariants. Do not add stricter positivity constraints to historical non-draft rows without a data audit. Route validation owns new-write format/positivity.
- Seller status IDs are lookup values, so do not hardcode a draft ID into a CHECK. Submission guards own valid facility/SDS state. A future cross-table constraint design is outside this change.
- Guard additive columns and constraint creation for reruns. No down migration or shared migration execution is authorized. An authorized local smoke must apply the migration twice and verify constraint behavior.

Wanted create/PATCH also require an active buyer/both company and active member with owner/admin role, requester/approver/executor tier, or CanExecuteTransactions, with an admin bypass. Owner/admin override applies independently of permission tier. Other viewer roles and view_only tiers remain denied, even with CanExecuteTransactions. Inactive/suspended companies cannot mutate drafts or publish. Pending verification does not block a private save.

SQL owns durable draft flags and fields. Backend alone derives `statusCode`: draft first, otherwise closed if `IsOpen=0` or an accepted quote exists, otherwise open. Frontend renders this value and never infers draft from missing quantity. No frontend-only auth or draft storage.

## Parent locking and modules

All wanted PATCH operations load the owner row with `UPDLOCK,HOLDLOCK` inside one transaction, validate ownership/status and accepted quotes there, then update and reread. Publish is an atomic mutation of the same row. Competing publishes serialize; the second sees the published state rather than creating another request.

Keep existing lock order: wanted parent, seller listing, quote. RFQ response creation must re-read unit/material/owner/status under its parent lock, rather than trust the current pre-transaction snapshot. `api.ts:updateQuote` rejects a draft parent and keeps existing accepted closure, inventory, SDS, alias-compatible units, and immutable quote relationships. Drafts cannot have quote responses through any API path.

Keep the change shallow: `wanted-listing-domain.ts` owns pure boundary validation/merge/status projection; existing `api.ts` wanted functions own authenticated transport, SQL transactions, and audit. `rfq-routes.ts` and `api.ts:updateQuote` enforce draft exclusion at RFQ boundaries. `listing-routes.ts` owns seller save/projection/document access. No new service layer or duplicated auth state.

Proposed pure signatures:

```ts
parseWantedCreate(body: unknown): ValidatedWantedCreate;
mergeWantedPatch(saved: WantedSavedState, body: unknown): ValidatedWantedState;
wantedStatus(saved: { isDraft: boolean; isOpen: boolean; acceptedCount: number }): WantedListingStatusCode;
```

## Source trace and affected joins

`api.ts:handleApiRoute` invokes modular handlers before legacy CRUD. Legacy listing/sample implementations remain in `api.ts` but are unreachable unless explicitly forwarded. Avoid modifying those dead implementations as proof of a live fix.

| Surface and source | Current behavior | Required treatment |
| --- | --- | --- |
| `listing-routes.ts:selectListing/readListing/save` | INNER location join hides locationless rows; save validates facility before status. | LEFT JOIN location, preserve company/status predicates, validate optional facility after resolving status. Locked owned read must find locationless drafts. |
| Listing catalogue/detail and radius | Non-owner path requires published status and active seller; radius rejects missing coordinates. | Retain predicates. LEFT JOIN alone never grants access. Own reads keep location object with null members. |
| Listing upload/metadata/download/delete | Reuses `readListing`, parent locking, seller membership, publication fallback. | LEFT JOIN enables owner document work on locationless drafts. Unknown SDS stays empty documents. Non-owner draft photo/document URLs still fail. |
| Core `listListingDocuments` | Unfiltered metadata is explicitly admin-only at dispatch. | Preserve admin gate. It has no location join. |
| `rfq-routes.ts`, `api.ts:listWantedListings/updateQuote` | Wanted discovery uses IsOpen; response writes lock parent, acceptance locks parent/listing/quote. | Explicit IsDraft exclusion, own detail route, locked publish and revalidation. Preserve acceptedCount closure. |
| `api.ts:listFavorites/setFavorite` | Favorite write accepts any listing ID; read LEFT JOIN location with no draft filter. | Reject draft writes; exclude draft rows from returned favorites. Other tenant draft metadata must never leak through guessed IDs. |
| `api.ts:recordInterest/listInterestSummary` | Interest write accepts any listing ID; summary is seller-company scoped. | Reject draft interest writes. Keep own summary null-safe, without fabricating counts or commercial values. |
| `tracker-routes.ts` listing/files | Seller scope is own company; buyer scope accepts favorite/sample/lab/pilot/order relationship; LEFT location join already. | Seller owns drafts; exclude drafts from buyer listing and file projections even through stale favorites. Historical transaction records retain their own scope. |
| `api.ts:getReportSummary` | Orders/sample/escrow aggregates are company scoped; listing joins use IDs and titles, no location. | Preserve historical financial results; drafts have no new transactions. No new draft volume/price aggregation or WantedListings report join. |
| `api.ts:notifySavedSearchMatches` | LEFT location join, called after published save. | Add published-state guard to reread so concurrent demotion cannot notify draft details; no null-to-zero pricing substitution. |
| `checkout-routes.ts`, `api.ts:createQuote/updateQuote`, `requirePurchasableListing` | Published seller listing checks; no nullable location arithmetic. | Preserve rejection of draft supply and existing transaction validation. |
| `lab-routes.ts:publishedListing` | INNER location join plus published/positive stock checks. | Retain INNER JOIN: locationless drafts are ineligible, not hidden owner content. Lab report access uses separate parent ownership/publication checks. |
| `pilot-routes.ts` | INNER location join plus published/positive stock. | Retain; pilot shipment requires actual origin. |
| `sample-shipping-routes.ts` | Published positive stock before separately loading origin. | Retain; missing origin remains ineligible, no provider request for a draft. Generic sample POST already refuses and routes to shipping. |
| `logistics-routes.ts`, `api.ts` shipments | LEFT location joins through existing order/shipment origins. | Preserve historical nullable projections; no invented origin. |
| `market-portfolio-store.ts` and catalogue portfolio filtering | Adding supply requires published listing; catalogue independently rechecks published. | Retain both gates; private portfolios do not authorize draft discovery. |
| Lookup routes | Material/status/location lookup tables do not join Listings.LocationId. | No nullable-listing adaptation needed. Location choices retain company scope. |

## Alternatives and accepted tradeoffs

| Design | Invariants and concurrency | Migration and caller cost | Decision |
| --- | --- | --- | --- |
| Extend WantedListings with IsDraft, derive API status | One parent and identity; every discovery/response path must exclude drafts. Existing parent locks serialize publish/response/acceptance. | Four nullable columns, two additive columns, conditional CHECKs. Existing routes gain draft mode. | Selected: smallest change with one authoritative lifecycle. |
| Separate WantedListingDrafts table | Drafts structurally cannot join Quotes. Publish atomically inserts demand and marks draft consumed. Needs publish mapping/idempotency and a second owner-state model. | Duplicate schema/CRUD, ID handoff after publish, extra frontend routes and union list. | Rejected for this bounded change; stronger physical isolation costs a second lifecycle. |
| Persist a new draft/open/closed status alongside IsOpen | Easy API projection, but status and IsOpen can diverge during acceptance. | Adds another mutable representation and touches existing RFQ closure. | Rejected: derive status instead. |

Accept nullable draft fields in the shared response in exchange for preserving source truth. Accept bounded updates to secondary discovery surfaces to keep private supply drafts private. Do not change commercial terms or accepted RFQ records to simplify the model.

## Verification after implementation GO

Run focused pure/route tests for draft null round trips, explicit clear vs omission, dates and numeric precision, cross-tenant reads/writes, status transitions, accepted requests, and RFQ draft refusal. Run existing listing/SDS/RFQ regressions, backend/shared types, backend lint/build, and sanitized runtime isolation checks.

Prepare a local SQL/API smoke that requires an explicit owned local SQL receipt and refuses shared endpoints. It must verify rerunnable migration, conditional CHECK rejection, own draft with no facility, forbidden submission without facility/SDS, buyer draft owner read/list/save/publish, anonymous/seller/cross-tenant exclusion, response refusal, and concurrent publish/respond/acceptance parent locking. It must use synthetic local fixture accounts only and preserve database contents. SQL-unconfigured unit tests do not prove SQL behavior.

Coordinator provisions or explicitly authorizes any dedicated local SQL runtime; this worker does not adopt/reset receipts or mutate shared SQL/providers. Frontend owner implements null-safe rendering and resume/publish paths, then reviews exact backend hashes; backend reviews exact frontend hashes. Coordinator owns browser/live data proof. Until those checks exist, this document and source inspection prove design only.

Launch evidence: process 71246 explicitly uses `gpt-6.1-sol`, medium, `service_tier=default`, `features.fast_mode=false`, on-request/workspace-write. Runtime receipt belongs to this root, Node 22.20.0, SQL unconfigured. Prior failed task `task_b3b726963f2a` and dispatch `ctx_2ac3b1ded6e7` remain audit evidence; this document does not alter them.

## Implementation checkpoint

Coordinator accepted design hash `3419279bfd10be361a53ff18fb0eddeb048b32a8fab160e91796931c38108320` and explicitly approved implementation. Nullable seller unit/currency were confirmed in the later approval. First sanitized pass: all 132 backend tests, backend/shared type checks, and backend build pass. The local SQL/API smoke is prepared in `packages/backend/src/private-drafts-sql-smoke.ts`, requires `ORCA_DRAFT_SMOKE=1` plus verified loopback SQL owner markers, and has not run. No SQL constraint, concurrency, browser, shared-data, or provider proof is claimed.
