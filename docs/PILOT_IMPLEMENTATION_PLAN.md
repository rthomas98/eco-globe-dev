# Pilot requests and scheduling implementation

Source: EcoGlobe_Pilots_Request_and_Schedule.docx and the three supplied PNG references. Build and verify locally; publication is a separate request.

1. Add relational pilot requests, staff availability, call reservations, attributed steps and searchable notes. Save request before booking; use idempotency and transactional slot locking. Preserve all existing data.
2. Buyer form from listing and buyer pilot list/detail: load choice plus approximate tonnage, company delivery location, timing, constraints and objective. No pilot prices, fees, payment or automatic carrier calls. Domestic US locations only in this regional v1. Existing company locations are saved addresses, not externally verified addresses.
3. Confirmation and 15-minute calendar: staff-managed real slots in America/Chicago, collision protection, email-contact preference fallback saved for staff followup. Empty availability must remain honest. Scheduling success means a database reservation, not an external calendar invite or sent email.
4. Internal desk: counts New / Call due / Working the lane / Offer sent / Moving; lifecycle new -> call_booked -> call_held -> working_lane -> offer_sent -> won/lost. Owner, next action, five attributed milestones, lane notes searchable across requests. Buyer explicitly proceeds from offer_sent; only that action releases identity. Admin cannot silently consent on buyer behalf.
5. Buyer-agreed pilot creates one shipment in existing fulfilment tables, without inventing a priced order. Staff handoff is idempotent and requires buyer consent. Existing order shipment behavior remains intact; pilot shipping amounts stay absent from buyer APIs.
6. Verify unit validation, tenancy, identity redaction, concurrent booking, duplicate requests/handoff, lifecycle, searchable notes, persistence and shipment visibility in local SQL. Browser: buyer request -> schedule -> refresh -> admin queue/notes/status -> buyer proceeds -> staff handoff -> fulfilment. Also email fallback and narrow layout.

## API contract for frontend implementation

All endpoints use the existing bearer/cookie API boundary; envelope `{ok:true,...}` and existing ApiError messages. IDs are numbers. Times are UTC ISO strings, display Central Time with DST. Optional text uses empty string.

- GET /api/pilots/config?listingId=N -> `{listing:{id,title,sellerCompanyName,locationLabel},locations:[{id,name,addressLine1,city,stateProvince,postalCode,countryCode}],constraints:[string],staff:[{userId,name}]}`. No prices. Company required. Staff only present for admins.
- POST /api/pilots/requests body `{listingId,clientRequestId,loadChoice:'one'|'two'|'other',loadCount:number,approximateTonnage:number,deliveryLocationId,neededBy:string,constraints:string[],objective:string}` -> `{request}`. `clientRequestId` UUID retained on retry.
- GET /api/pilots/requests -> `{requests}` current buyer company; GET /api/pilots/requests/N -> `{request,notes:[],steps:[],slots:[]}`. Buyer notes are empty (internal notes never returned).
- GET /api/pilots/slots -> `{slots:[{id,startsAt,endsAt,ownerUserId,ownerName}]}` future unbooked slots only.
- POST /api/pilots/requests/N/schedule `{slotId}` -> `{request}`; same slot retry succeeds, unavailable slot 409. Booking sets call_booked.
- POST /api/pilots/requests/N/email-preference `{}` -> `{request}` releases existing call if any; sets new, contactPreference email. This queues staff followup, does not send email.
- POST /api/pilots/requests/N/proceed `{confirm:true}` -> `{request}` only offer_sent, changes to won and records buyer consent. Copy: agreed terms off-platform and consent to share company with seller. No price field.
- GET /api/admin/pilots/requests?q=&status= -> `{requests,counts:{new,call_due,working_lane,offer_sent,moving},staff}`. Search notes/objective/title/region/reference. GET /api/admin/pilots/requests/N -> `{request,notes,steps,slots:[]}`.
- PATCH /api/admin/pilots/requests/N `{ownerUserId:number|null,nextAction:string,status:string}` (fields optional) -> `{request}`. Cannot set won (buyer action only). new/call_booked -> call_held -> working_lane -> offer_sent; lost allowed before won. Schedule drives call_booked.
- POST /api/admin/pilots/requests/N/notes `{body:string}` -> `{note}`.
- PUT /api/admin/pilots/requests/N/steps/KEY `{completed:boolean}` -> `{steps}`. Keys intro_call,seller_availability,equipment,logistics,offer. Row `{key,completed,completedByName,completedAt}`.
- POST /api/admin/pilots/requests/N/handoff `{}` -> `{request,shipmentId}` requires won; idempotent.
- GET /api/admin/pilots/slots -> `{slots,staff}` includes availability booked state. POST same `{ownerUserId,startsAt}` adds 15min slot (future, staff active, no overlap). DELETE /api/admin/pilots/slots/N removes unbooked only.
- GET /api/pilots/seller-interest -> `{requests}` redacts buyer name/id/site/objective/notes until buyer proceeds. Do not show internal notes after consent either.

Request fields: `{id,reference,listingId,listingTitle,sellerCompanyName,buyerCompanyName,originLabel,destinationLabel,loadChoice,loadCount,approximateTonnage,neededBy,constraints,objective,status,contactPreference,ownerUserId,ownerName,nextAction,callStartsAt,callEndsAt,buyerConsentedAt,shipmentId,createdAt,updatedAt}`. Admin sees full buyer identity; buyer sees its own. Seller projection is explicitly smaller.

Frontend owned by Claude: apps/web and apps/admin changes only. Backend and shared manifests/tests/docs owned by Codex. Use existing API helper; new local frontend contract types can live in apps/web. Request form should use actual locations; link existing location management if none. Do not fabricate dates, Verified badges, carrier availability, distances or example prices. Add pilot nav and existing listing entry. Existing admin fulfilment should show pilot shipment with pilot reference rather than an Order null link.
