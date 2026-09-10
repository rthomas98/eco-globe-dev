# Tracker verification

Implemented locally from BuyerTracker.png and SellerTracker.png. Routes: `/buyer/tracker` and `/seller/tracker`, both linked in portal navigation. No database reset, migration, production deployment, real payment or postage purchase.

## Data and behavior

The company-scoped `/api/tracker` projection combines listings, saved interest, samples, lab requests/reports, pilots and booked calls, orders, shipments and recorded payouts. Seller interest is aggregate; buyer identities and private buyer lab requests are not exposed. Documents use existing authenticated download endpoints. Sample request summaries are generated from saved records and identify local simulation explicitly; they are not tax invoices or postage.

Cards expand/collapse, stages are selectable, compact cards show a progress strip, and the file panel switches between step files and all files. Optional stages without evidence remain unrecorded. Multiple records at one stage remain accessible through activity history. Sample actions reuse the existing dispatch/decline API. Lab testing opens the existing form and refreshes the tracker on submission. Pilot, material, sample tracking and order links use existing portal pages.

Account verification, licence, purchase authority and payout status come from stored records. The tracker does not invent verification badges, account-file counts, shipping arrival dates, tax documents or future reports. Receiving sites show saved locations without claiming current carrier verification. Payout status is the recorded profile status, not a certification that a payout provider is connected.

## Checks completed

- Workspace type checking: six configured tasks passed.
- Focused tracker ESLint and git whitespace checks passed.
- Local API/SQL integration: authenticated buyer/seller projections, invalid role rejection, unauthenticated rejection, buyer sample ownership, private lab exclusion, delivered/refunded states, valid PDF summary response and missing-summary rejection passed.
- Buyer browser: three material cards loaded; switching to Testing showed no activity until a private test request was submitted. LAB-1012 then appeared without leaving the tracker.
- Seller browser: five owned material cards loaded in an isolated synthetic account. Mark as dispatched on SR-1020 changed the stored sample to in transit.
- Buyer browser refresh reflected SR-1020 in transit. Sample document links and lab request actions were exercised. The PDF summary response was independently verified through the API.
- Seller desktop and 390-pixel layouts were visually checked; long tracking values wrap and the timeline scrolls inside its card.
- Broad React Doctor comparison reported 43/100 with existing/broader findings (6 errors, 113 warnings). It is not a clean whole-repository certification and its diff scope does not certify new untracked files.

## Boundaries

Carrier arrival dates and production financial verification remain unavailable pending the sample provider setup. Account verification documents and future logistics files are not fabricated: only listing documents, accessible lab reports, available sample labels and saved sample summaries are currently listed. Existing order/pilot detail pages retain their full workflow. No end-to-end real-carrier or production-money test was performed.
