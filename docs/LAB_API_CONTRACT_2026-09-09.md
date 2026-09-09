# Lab API contract — 2026-09-09

Backend-owned contract; types: `packages/shared/src/lab-api.ts`. All paths below are backend `/api` paths, proxied by web under `/api/backend`. JSON errors use `{ok:false,error:string}`. All lab responses including files use `Cache-Control: private, no-store`; proxy must preserve this and fetch with no-store. Never add lab bytes to generic listing documents.

| Endpoint | Body / response |
|---|---|
| GET /api/lab/config?listingId=N | Public, published/available listing only. `{ok:true,config:LabConfig}`. Config includes `listingTitle`, `sellerCompanyName`, `locationLabel`, categoryCode from saved material type. Draft/unknown: panel=null,scopeToBeConfirmed=true, optionalTests=four generic concern questions. No draft family names, tests or review evidence. |
| POST /api/lab/requests | Bearer active company; `LabRequestWrite`. Returns 201 `{ok:true,request:LabRequest}`, same-key identical retry 200 same envelope. Same company/key with different payload:409. Company-scoped key must be 16..100 alphanumeric/underscore/hyphen (UUID accepted). Server validates listing availability, panel/version, each test and sample ownership. Own listing rejected. |
| GET /api/lab/requests | Bearer company; `{ok:true,requests:LabRequest[]}`. Optional `?listingId=N`. Only requesting company, no notes/owner. |
| PATCH /api/lab/requests/:id/sharing | Requesting company only; `{sharing:"private"|"shared"}` -> `{ok:true,request:LabRequest}`. Explicit shared choice is consent. Revocation immediately removes other-company/seller/public reads and file downloads. |
| GET /api/listings/:id/lab-reports | Optional bearer; `{ok:true,reports:LabReport[]}`. Anonymous sees only published reports with active shared consent on a publicly visible listing. Authenticated requester sees own private reports; internal staff sees all. No unauthorized request data. |
| GET /api/lab/reports/:id/file | Same access policy; authorized PDF bytes, attachment, nosniff, no-store. 404 when unavailable/unauthorized; invalid supplied bearer:401. |
| GET /api/admin/lab/requests | Internal admin; `{ok:true,requests:LabAdminRequest[]}`. Optional status filter. |
| PATCH /api/admin/lab/requests/:id | `{status?,ownerUserId?:number|null,notes?:string}` -> `{ok:true,request:LabAdminRequest}`. Notes replaces current notes with append-only audit events preserving changes. Status requested/reviewing/awaiting_sample/testing/completed/cancelled; completed requires an attached report. |
| GET /api/admin/lab/assignees | `{ok:true,assignees:[{userId:number,name:string}]}`; active admin + admin_override members with active user accounts only. |
| GET /api/admin/lab/panels | `{ok:true,panels:(LabPanel & {review:LabReview|null})[]}` incl drafts. |
| POST /api/admin/lab/panels | `LabPanelWrite` ->201 `{ok:true,panel:LabPanel & {review:LabReview|null}}`. Append immutable new version per family; publishing retires previous published version. Empty draft mapping is allowed; published mapping must use actual MaterialTypes codes. Publication requires explicit laboratoryName,reviewedBy,reviewedAt YYYY-MM-DD,evidence. No draft automatically published. |
| POST /api/admin/lab/requests/:id/reports | `LabReportWrite` ->201 `{ok:true,report:LabReport}`. Actual PDF base64 ≤5MiB decoded; filename .pdf; real 1..4 result label/value/unit strings (unit can be empty). Dates YYYY-MM-DD nonfuture, report >= sample. published boolean controls listing publication in addition to request consent; requester/internal staff retain private access. |
| PATCH /api/admin/lab/reports/:id | `{published:boolean}` -> `{ok:true,report:LabReport}` permits publication withdrawal. |

`LabReport` includes `sharing` so requester UI can explain consent. It never exposes owner or internal notes. `source` is derived: sampleRequestId present = sample; null = listing. For the sample entry point, save the sample first, then open the same lab form with its returned ID; reuse sample idempotencyKey after an uncertain network result. Lab create does not create or ship a sample.

## Minimal live sample port

GET `/api/sample-requests` -> `{ok:true,samples:[{id,listingId,listingTitle,listingSlug,buyerCompanyId,buyerCompanyName,sellerCompanyId,sellerCompanyName,quantityLb,note,deliveryAddress,status,sellerResponse,trackingNumber,convertedOrderId,createdAt,updatedAt}]}`; buyer/seller parties and internal admin only.

POST `/api/sample-requests` accepts live shape `{listingId,quantityLb?,note?,deliveryAddress?}` plus optional `idempotencyKey` (same format as lab). FE should always send the key. Returns 201 `{ok:true,sample:{id,listingId,status}}`, retry 200. Rejects own/unpublished/unavailable listing. Quantity defaults 5lb, range 1..50 with <=2 decimals.

PATCH `/api/sample-requests/:id` accepts live `{status?,sellerResponse?,trackingNumber?,convertedOrderId?}`. Seller transitions requested→accepted/declined and accepted→shipped/declined; buyer shipped→received; internal admin may perform party transitions. Only seller/internal staff writes sellerResponse/trackingNumber. Buyer/internal staff may link a received sample once to their order for exactly the same listing. No external notification or shipment provider.

Auth reuses the retained Ana `requireSessionAuth`: `isAdmin` requires revalidated admin member role plus admin_override permission tier; ordinary company admin is not internal. No new grant table. Internal referral notifications persist in existing dbo.Notifications for active internal recipients and never call an email provider. Coordinator owns SQL migrations and browser validation; no shared DB writes in worker tests.
