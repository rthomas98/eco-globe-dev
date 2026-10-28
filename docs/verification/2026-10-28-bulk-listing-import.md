# Bulk listing import from a spreadsheet — 2026-10-28

Status: built, reviewed and browser-tested against an isolated local SQL runtime. Not yet migrated, deployed or pushed.

## What it does

Sellers (`/seller/listings/import`, from **Import from spreadsheet** on Listings) and admins (`/admin/listings/import`, with a seller company picker) can create many listings at once:

1. Download an `.xlsx` template: Listings, Instructions and Lists sheets, with drop-downs for active material types, units, currencies (USD first) and the seller's own facilities.
2. Upload up to 500 rows (2 MiB). The server checks every row and stores a preview for 24 hours. Errors block the import (unknown material, unit or facility, bad number or date, minimum order above quantity, demo-estimate marker); warnings do not (missing price/currency/facility/quantity, non-USD currency, duplicate title).
3. Import: all rows become **draft** listings in one transaction. Commit is idempotent per preview; a lost response is resolved by reading the preview back.
4. Finish the drafts on the same page: inline **Complete details** (quantity, unit, minimum order, price, currency, facility), per-row SDS upload, bulk SDS upload matched by file name to listing title (ambiguous or unknown names are refused, never guessed), then **Submit for review** (seller) or **Publish** (admin), per row or all ready.

Drafts are required because submission needs an SDS (existing rule).

## API (backend, Codex)

| Route | Purpose |
| --- | --- |
| `GET /api/listing-imports/template?sellerCompanyId=` | Template workbook |
| `POST /api/listing-imports/preview?sellerCompanyId=` | Raw `.xlsx` → stored preview |
| `GET /api/listing-imports/{id}?sellerCompanyId=` | Read a preview (creator only; committed previews stay readable after expiry) |
| `POST /api/listing-imports/{id}/commit?sellerCompanyId=` | `{ idempotencyKey: uuid }` → drafts |

Non-admins must act as their active seller company with an owner/admin/seller_operator membership; admins may use any company with a seller profile. The workbook reader reuses the hardened market-record parser (zip/size limits, worker deadline, no macros, formulas or external links). At most three parses run at once; listing imports may use two, leaving one for admin market imports; one concurrent preview per user (429). Old uncommitted previews are cleaned up on each upload and capped at 10 live per user and company.

## Database

Additive migration `packages/backend/db/migrations/20261028_listing_imports.sql` (also in `schema.sql`): table `dbo.ListingImportPreviews`, indexes `IX_ListingImportPreviews_OwnerExpiry` and filtered `IX_ListingImportPreviews_PendingExpiry`, record type `listing_import`. Guarded and re-runnable; no existing table changes. Script: `pnpm --filter=@eco-globe/backend db:migrate:listing-imports`.

## Commits (branch `t3/bulk-listing-import-frontend`)

- `16e5330`, `05aeaa7`, `9dd55c1`, `eea3b2a`, `3d3b837`, `1bb3e62` and the operation-lock fix — frontend (Claude)
- `b099379` (= Codex `0743106`), `2e6f12d` (= `adc9a39`) — backend (Codex)
- `8bb2c16` — parser slot reservation and pending-preview index (Claude, from backend review)

## Reviews

- Backend round 1 (Claude): two P2 (unbounded parse workers, unbounded preview table) and six P3; all fixed by Codex in `adc9a39`. Round 2: no P1/P2; two P3 fixed in `8bb2c16`, one informational (limits are per API process; some Excel-native re-saves with direct-range drop-downs are still refused as formulas).
- Frontend round 1 (Codex): three P2 (admin edit link had no editor, no recovery from an expired preview, start-over during commit) — fixed in `eea3b2a`. Round 2: two P2 (duplicate responsive forms, concurrent saves) — fixed in `1bb3e62`. Round 3: one P2 (the save lock only worked in one direction) — fixed with a single page-wide operation lock that only its owner releases; round 4 pending.

## Checks

| Check | Result |
| --- | --- |
| Web lib tests (tsx) | 375 passed (10 listing import) |
| Backend listing import + listing routes + market records | 51 passed |
| `pnpm orca:verify` | 22 runtime, 193 backend tests, backend types — passed |
| `pnpm type-check` | 6/6 packages |
| Web and admin production builds | Passed (existing `<img>` warnings) |
| Codex SQL smoke (isolated SQL) | 42 checks reported |

## Browser evidence (local, isolated SQL, synthetic accounts)

Seller (GulfStar Chemicals): template download; error workbook showed three blocking rows and disabled import; valid workbook (thousands separators, `$`, `t`, case-insensitive facility) imported five drafts; bulk SDS matched two files and refused an ambiguous and an unknown name; per-row SDS; **Submit for review all ready** moved three listings to pending review; reload resumed the import. Admin: picked the seller, imported, uploaded an SDS and published; Complete details refused a missing price, then saved price, currency and facility (read back from the API); a foreign or expired preview offered **Start a new import**; a draft typed at 1280 px survived resizing to 390 px; row actions locked while saving; with an SDS upload's response held back, Save on another listing's form stayed disabled, a forced click was refused without sending a request, and Save re-enabled once the upload finished. 390 px: card layout, no horizontal overflow. API: same-key replay returns the stored result, a different key 409, four concurrent previews by one user → one 201 and three 429; existing listings kept after the local migration.

## Open

- Apply the migration to the development database, deploy the API and the web app (awaiting approval).
- Not tested in desktop Excel, LibreOffice or Google Sheets.
- Limits are per API process.
