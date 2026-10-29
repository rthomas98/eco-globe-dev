# FUEL/LSU demo products made sellable on development — 2026-10-29

Status: done on [development](https://eco-globe-dev-web.vercel.app). Data-only change through the admin API; no code, migration or deployment.

## Why copies, not the drafts

The 11 FUEL/LSU demo products (listings #32–42) are drafts used by the demo playlists and presentations, which only show listings while they stay drafts. They also carry the `DEMO ESTIMATES (presentation only):` marker, which blocks submission, and two of the five companies had no facility. With the user's approval, the drafts were left untouched and published copies were created instead.

## Development data (admin session, `POST`/`PATCH` through the web proxy)

- Five pickup locations named "Demo pickup site (placeholder)", one per demo company (45–49): Ruston LA, Baton Rouge LA ×3, Tickfaw LA.
- Eleven published listings #43–53, one per draft, same title, seller and material: USD 100/tonne, 100 tonnes, MOQ 1 tonne. Each description says it is a demo listing with placeholder price and stock and names its source draft.
- One SDS per listing:

| Listing | Source draft | SDS |
| --- | --- | --- |
| 43 Geopolymer well cement | 32 | `Geopolymer_Binder_Reference_SDS.pdf` (covers well and construction binders) |
| 44 Geopolymer construction / pipe-rehab material | 33 | `Geopolymer_Binder_Reference_SDS.pdf` |
| 45 CO2-derived renewable ethanol | 34 | `Ethanol_Reference_SDS.pdf` |
| 46 CO2-derived ethylene | 35 | `Demo_SDS_CO2_Derived_Ethylene.pdf` (generated placeholder) |
| 47 CO2-derived acetic acid | 36 | `Demo_SDS_CO2_Derived_Acetic_Acid.pdf` (generated placeholder) |
| 48 Green hydrogen | 37 | `Green_Hydrogen_Reference_SDS.pdf` |
| 49 Sodium aluminate | 38 | `Demo_SDS_Sodium_Aluminate.pdf` (generated placeholder) |
| 50 Alumina trihydrate (ATH) | 39 | `Demo_SDS_Alumina_Trihydrate.pdf` (generated placeholder) |
| 51 CO2-derived acrylonitrile | 40 | `Acrylonitrile_Reference_SDS.pdf` |
| 52 CO2-derived propylene | 41 | `Propylene_Reference_SDS.pdf` |
| 53 Producer gas | 42 | `Demo_SDS_Producer_Gas.pdf` (generated placeholder) |

Reference sheets come from the supplied `SDS.zip` (public-source reference documents, not supplier SDSs). The five generated PDFs are labelled "Safety Data Sheet — DEMONSTRATION DOCUMENT" and contain no safety data.

Afterwards: drafts #32–42 still `draft`, unchanged (last update 2026-10-20), no documents added. Listings 41 → 52; published 18 → 29.

## Live checks (buyer `bianca.buyer.e2e1`, Stripe sandbox test card)

- Buyer API: all 11 published, SDS listed, each download byte-identical to its source file.
- Public `/browse/{id}` and buyer `/buyer/browse/{id}` for all 11: SDS shown, Buy Now and Add to Cart enabled.
- Buy Now, 1 t each, every payment confirmed by Stripe and captured:

| Order | Listing | Shipping |
| --- | --- | --- |
| EG-32 | 53 Producer gas | Pickup |
| EG-33 | 43 Geopolymer well cement | Delivery (saved Rotterdam site) |
| EG-34 | 44 Geopolymer construction | Pickup |
| EG-35 | 45 Ethanol | Delivery |
| EG-36 | 46 Ethylene | Pickup |
| EG-37 | 47 Acetic acid | Delivery |
| EG-38 | 48 Green hydrogen | Pickup |
| EG-39 | 49 Sodium aluminate | Delivery |
| EG-40 | 50 ATH | Pickup |
| EG-41 | 51 Acrylonitrile | Delivery |
| EG-42 | 52 Propylene | Pickup |

- Database: each order `in_progress` with one payment; each listing's stock 100 → 99 t.
- Buyer My Orders and Payment Center list EG-32–42; admin `GET /api/orders` returns all 11 with the right seller company.

## Open

- No seller login exists for the five FUEL/LSU companies, so the seller-side view of these orders was not checked.
- EG-32–42 remain as demo orders on development.
- Admin listing views show each product twice (presentation draft and published copy); buyers see only the published copy.
