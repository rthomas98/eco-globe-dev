# Staff-managed logistics MVP contract

No live carrier booking, automated rate shopping, GPS tracking, or fund transfers are claimed. Quotes are manually recorded by seller/staff; buyer acceptance records approval for staff coordination. Use only persisted API records, no demo fallbacks. Carrier catalogue is informational.

`GET /api/logistics/workspace` authenticated returns `{ok:true, orders: LogisticsOrder[], carriers: {id,code,name,isActive}[]}` scoped to active company; admin sees all. Each LogisticsOrder: `id, orderStatusCode, buyerCompanyId, sellerCompanyId, buyerCompanyName, sellerCompanyName, listingTitle, quantity, quantityUnitCode, shippingTypeCode, currencyCode, deliveryAddress, fulfilmentLocked, shipment: null | {id,statusCode,carrierId,carrierName,trackingNumber,pickupScheduledAt,deliveryConfirmedAt,originName,originLatitude,originLongitude,destinationName,destinationLatitude,destinationLongitude,bolFileName,bolUploadedAt,receiverName,deliveryNotes}, quote:null|{id,status,carrierId,carrierName,amount,currencyCode,pickupScheduledAt,estimatedDeliveryAt,note}`. Nullable properties may be null. `quote.status`: offered/accepted. Shipment states quote_pending/scheduled/in_transit/delivered/exception. Order terminal cancelled/completed rejects new quote/dispatch. Existing completed records remain visible.

All actions are POST JSON to `/api/logistics/orders/:id/:action`, return `{ok:true}`; reload workspace on success. Errors standard `{ok:false,error:string}`. Seller must match activeCompanyId; buyer similarly; admin allowed quote/dispatch/BOL, but confirmation/acceptance requires buyer company (admin does not impersonate receipt).
- `quote`: seller/admin, `{carrierId,amount,currencyCode,pickupScheduledAt,estimatedDeliveryAt?,note?}`. Manual quote, no provider charge/booking. Replaces only an unaccepted offer; server refuses after scheduling.
- `accept`: buyer, `{quoteId}`. Atomic quote acceptance + scheduled shipment. Repeated same acceptance safe. No card charge/fund release.
- `bol`: seller/admin, `{fileName,contentType,dataBase64}`. PDF only <=5 MiB. Private file stored through backend, linked to shipment. Does NOT dispatch. Scheduled shipment required.
- `dispatch`: seller/admin, `{trackingNumber?}`. Scheduled shipment and BOL required; persists in_transit. No invented tracking reference.
- `confirm`: buyer, `{receiverName,notes?,inspectionComplete:true}`. In_transit shipment required; atomic shipment delivered and order completed; records receipt evidence. Does NOT mark money transferred or release escrow automatically.
- `GET /api/logistics/orders/:id/bol`: authorized participant/admin download PDF.

Existing `fetchShipments` remains for maps/pilots. Update `confirmOrderDelivery` helper to call new atomic confirm endpoint (accept optional receipt details or ensure all callers supply details) and return `{escrowReleased:false}`. Update uploadBillOfLading helper to new bol endpoint; never infer tracking IDs from uploaded URL. Do not change unrelated payments or provider code.

Frontend: shared persisted workspace for buyer/seller/admin logistics with order selection, state-appropriate actions, clear staff-managed label, loading/error/empty states, refresh, private BOL download, SavedShipmentMap adapter where coordinates available. Preserve separate PilotShipmentsSection. Remove main demo routes/carrier telemetry claims. Keep existing route wrappers/layouts.

All mutations require an in_progress order and reject dispute-locked escrow. Pickup orders bypass carrier shipping: buyer confirm creates a delivered pickup shipment and receipt atomically. Existing pickup shipments must be in_transit to confirm. Staff cannot impersonate buyer approval/receipt. Workspace includes currencyCode and deliveryAddress.
