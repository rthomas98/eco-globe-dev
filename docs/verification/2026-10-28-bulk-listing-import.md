# Bulk listing import from a spreadsheet — 2026-10-28

Status: released to [development](https://eco-globe-dev-web.vercel.app) on 2026-10-28 (dev database migrated, API and web deployed, branch pushed).

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

- `16e5330`, `05aeaa7`, `9dd55c1`, `eea3b2a`, `3d3b837`, `1bb3e62`, `2e98899` — frontend (Claude)
- `b099379` (= Codex `0743106`), `2e6f12d` (= `adc9a39`) — backend (Codex)
- `8bb2c16` — parser slot reservation and pending-preview index (Claude, from backend review)
- `f93bab8` — Dockerfile copies `listing-import-api.d.ts` (found by the first image build; no local check builds the image)

## Reviews

- Backend round 1 (Claude): two P2 (unbounded parse workers, unbounded preview table) and six P3; all fixed by Codex in `adc9a39`. Round 2: no P1/P2; two P3 fixed in `8bb2c16`, one informational (limits are per API process; some Excel-native re-saves with direct-range drop-downs are still refused as formulas).
- Frontend round 1 (Codex): three P2 (admin edit link had no editor, no recovery from an expired preview, start-over during commit) — fixed in `eea3b2a`. Round 2: two P2 (duplicate responsive forms, concurrent saves) — fixed in `1bb3e62`. Round 3: one P2 (the save lock only worked in one direction) — fixed in `2e98899` with a single page-wide operation lock that only its owner releases. Round 4: no actionable findings (`git diff 1bb3e62..2e98899 -- apps` digest `9bd61ebb7f9ffe5bc6f695ae156694e174bf694f5436f5ce401bcd659413b95c`).

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

## Release

- **Dev database** (`sqldb-ecoglobe-dev`): applied only `20261028_listing_imports.sql` with `sqlcmd`. Before: 117 `dbo` tables, 41 listings, no import table. After: 118 tables, 41 listings, `dbo.ListingImportPreviews` with `IX_ListingImportPreviews_OwnerExpiry` and `IX_ListingImportPreviews_PendingExpiry`, record type `listing_import`. Nothing reset.
- **API**: ACR build `ca1h` (`ca1g` failed on the missing Dockerfile copy, fixed in `f93bab8`), image `acrecoglobe7c180adf.azurecr.io/ecoglobe-backend:listing-import-f93bab8`, digest `sha256:a8d06acd700916e592affc683ba82f1f48fb82121e7d284756779e80a19d9e40`; revision `ecoglobe-backend-dev--import-f93bab8` Healthy, 100% traffic; `/health` reports SQL connected.
- **Web**: branch `codex/deploy-ecoglobe-backend` pushed `45630b8..f93bab8`; clean `git archive` of `f93bab8` deployed to `eco-globe-dev-web` production target `dpl_G6FBKzeDMsAktAZpDS3MXQ1hb3LM`, Ready, aliased to `eco-globe-dev-web.vercel.app`. `/seller/listings/import` and `/admin/listings/import` return 200; the proxied health is connected; unauthenticated import routes return 401.
- **Live check** (dev seller account, Greenfield Biomass LLC): template downloaded with the company's facility; a two-row preview returned one ready row and one error row (unknown material, minimum order above quantity). Not committed; no listings were created. The test session was signed out.
- The separate `eco-globe-dev-admin` Vercel project was not redeployed; the admin import page is live in the web app at `/admin/listings/import`.

## Open

- Not tested in desktop Excel, LibreOffice or Google Sheets.
- Limits are per API process.
