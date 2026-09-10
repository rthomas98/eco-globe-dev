# Buyer and seller trackers

Implement the supplied BuyerTracker and SellerTracker designs as authenticated `/buyer/tracker` and `/seller/tracker` pages. Reuse authoritative listing, favorite, sample, lab, pilot, order, shipment and payout records; no new parallel workflow state and no database reset.

1. Add a company-scoped read projection. Buyer rows include saved listings and their company's transactions; seller rows include owned listings. Keep anonymous interest anonymous and exclude private buyer lab work from seller data.
2. Render account readiness, expandable material cards, selectable stage timelines, actual file counts and authenticated document links. A later stage does not prove that optional earlier stages occurred. Show unknown readiness explicitly.
3. Reuse sample dispatch/decline APIs, lab request dialog and existing pilot/order pages. Refresh after actions and preserve source workflow authorization.
4. Verify isolation and stage interpretation, browser buyer/seller views, expansion, documents, seller actions and buyer refresh. Simulation remains explicitly labeled; no carrier/payment account is required and no production activation occurs.
