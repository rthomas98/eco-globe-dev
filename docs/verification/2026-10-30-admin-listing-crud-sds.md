# Admin listing CRUD and SDS management — 2026-10-30

Status: released to development. Admins can create, view, edit, close and reopen any listing, and can add, replace or remove its Safety Data Sheet (SDS), from https://eco-globe-dev-admin.vercel.app/admin/listings. The same pages are also served by the web app's admin route group.

## What changed

- **Listings page** (`/admin/listings`): New listing, Import from spreadsheet and Export buttons. A status filter with counts and a search by product title or seller (an `LS-<n>` search matches exactly). Each row shows the status, whether an SDS is on file or missing, the price, availability and order totals. Row actions are View, Edit, Close (with a confirmation) and Reopen.
- **New listing** (`/admin/listings/new`): pick any seller company of type seller or both, enter the basics and optionally a pickup site from that company. This creates a draft and opens the edit page at `#sds`.
- **Edit** (`/admin/listings/LS-<n>/edit`): the seller's form, now shared as `ListingEditForm`, with admin options:
  - The seller company is named, and the "Ships from" list shows the seller's own sites.
  - Status can be set to Draft, Pending review, Published, Paused or Closed.
  - Every save with a Pending review or Published target runs the full submission checks, including the SDS.
  - Save and the status options are disabled from the moment a document upload or delete starts until the server's status has been re-read, with a Retry if the re-read fails.
- **Listing detail card**: Edit listing, Add/Manage SDS, a missing-SDS warning, and Close or Reopen.
- **Keyboard access**: document upload inputs can now be reached by keyboard and have an accessible name. This applies to seller pages too.
- **Backend** (`packages/backend/src/listing-routes.ts`):
  - An admin document upload no longer changes the listing's status.
  - When an admin deletes a document, a published listing stays published if a usable SDS remains. If no usable SDS remains, a published or pending-review listing moves to draft.
  - Seller behaviour is unchanged.
  - Both document transactions lock the listing row (`UPDLOCK, HOLDLOCK`) before checking for an SDS.
- **Delete is a close.** Closing keeps order, payment and document history. A closed listing can be reopened as a draft.

## Process

- Codex (`gpt-6.1-sol`, medium, standard service) wrote the backend and Claude (`claude-opus-5-5`, medium) wrote the frontend, each in its own T3 worktree.
- **Backend:** Claude reviewed it and approved it with one hardening note, which became the row lock in `92c8efc`. I then reviewed that fix myself.
- **Frontend:** Codex reviewed it in three rounds.
  - Round 1 found two problems: the status was stale after an SDS replacement, and an unchanged published status skipped the full checks.
  - Round 2 found that Save was possible while the status re-read was still running.
  - Round 3 approved.

| Commit on `codex/deploy-ecoglobe-backend` | Source |
| --- | --- |
| `c6ef5b7`, `642b624` | Backend: preserve published status on admin document changes; serialize document mutations (`137c470`, `92c8efc`) |
| `98df3f2`, `918bbca`, `7969fe7`, `75595ca`, `9ecba6e` | Frontend: admin edit and SDS; full CRUD; status reconciliation; blocking Save until the status is confirmed; blocking Save during document mutations (`31eb20f`, `eb3ebaa`, `139fe3c`, `44cd515`, `9e1b2ec`) |

## Checks on the combined tree

The checks ran in worktree `t3-0c36115d` on tree `6346a378`, which is identical to `9ecba6e`. The primary checkout had no installed dependencies, and a fresh `pnpm install` stalled.

| Check | Result |
| --- | --- |
| Backend tests | 206/206 |
| Backend build and type-check | Pass |
| Web, admin and web test-config type-checks | Pass |
| Web library tests | 400/400 |
| Web and admin production builds | Pass; `/admin/listings/new` and `/admin/listings/[id]/edit` built |
| ESLint on changed web files | 0 errors; 1 warning that predates this change |
| `git diff --check` | Clean |

Two checks did not run: `pnpm orca:verify` and executed-SQL smoke checks in the isolated runtime. After the T3 restart, the worktree reservations reported a device-ID mismatch, and nobody edited the shared registry. The development database checks below exercised the SQL paths instead.

## Release

- **API:** ACR run `ca1j`, image `acrecoglobe7c180adf.azurecr.io/ecoglobe-backend:admin-listings-9ecba6e`, digest `sha256:8a78ac4e7177e4c14222be6f7e0e6ac9a9399e3e54190b32a566b5d6ca523286`. Revision `ecoglobe-backend-dev--adminlist-9ecba6e` is Healthy with 100% of traffic, and `/health` reports SQL connected. The previous revision, `ecoglobe-backend-dev--import-f93bab8`, remains available for rollback.
- **Web:** a clean `git archive` of `9ecba6e` was deployed as `dpl_6HVbijg3t7CJmqyBPrHKgz8WFafk`. It is Ready on the production target, aliased to `eco-globe-dev-web.vercel.app`.
- **Admin:** the same archive was deployed as `dpl_AbicU8bVsymnNHKYr9FnbwvJPEvS`. It is Ready on the production target, aliased to `eco-globe-dev-admin.vercel.app`.
- `/admin/listings`, `/admin/listings/new` and `/admin/listings/LS-54/edit` return 200 on both apps.

## Live development test (demo admin, admin app)

1. **Listings table:** shows 96 listings with the status filter, search, SDS column and row actions.
2. **New listing:** created LS-98, "Admin CRUD test listing (delete me)", for Cabot (company 58). Choosing Cabot listed its own sites, Franklin and Ville Platte; I chose Ville Platte. The listing was created as a draft and the page redirected to `edit?created=1#sds` with a notice.
3. **SDS upload:** uploaded a labelled test PDF, which showed as "pending verification". Save re-enabled once the status was confirmed.
4. **First publish attempt:** blocked by the full checks, which require a feedstock state and a frequency. After filling those in, the save succeeded and the server reported `published`.
5. **Admin TDS upload to the published listing:** the server status stayed `published`, with SDS and TDS on file.
6. **Admin price edit on the published listing:** the price changed from 50 to 55 and the listing stayed `published`.
7. **Close from the table:** the confirmation dialog explains that history is kept. Afterwards the server reported `closed` and the row showed Reopen.
8. **Reopen:** the server reported `draft`.
9. **Republish, then remove the only SDS:** the server moved the listing to `draft`. The editor switched to Draft and showed "Removing the last SDS moved this listing to Draft. Choose Published again to republish after adding an SDS."
10. **Clean-up:** LS-98 was closed again, it holds only the test TDS, and the admin was logged out.

## Follow-ups

- At a 1280px viewport the listings table is wider than the content area, so the Close and Reopen action column is cut off on the right. Responsive layout and 390px checks were not run.
- The new-listing form does not ask for feedstock state or frequency, but publishing requires them, so the admin learns this on the edit page.
- The "Ships from" picker still says "your company" when an admin uses it.
- The listings table loads every listing on the client, with no server paging, and search runs only over the loaded rows.
- LS-98 remains on development as a closed test listing.

## Follow-up: edit from the moderation queue

- Commit `c3ac9af` adds two links to each `/admin/moderation` card. **Edit** opens `/admin/listings/LS-{id}/edit`. The SDS line reads "SDS on file · Manage" or "No SDS · Add SDS" and opens the same page at `#sds`. `ApiAdminListing` gains an optional `documents` field.
- **Review:** Codex approved with no findings.
- **Checks** on identical tree `9ca1e9a3`:

  | Check | Result |
  | --- | --- |
  | Web and admin type-checks | Pass |
  | ESLint | 0 errors; 1 `<img>` warning that predates this change |
  | Web library tests | 400/400 |
  | Web and admin builds | Pass |

- **Deployed:** web `dpl_3mDY5oMMZy3coTiBeoiwUAdMM8xi` and admin `dpl_7zBcuCPjPievoR6WThKdkQHS2ohX`, both Ready on the production target. The API is unchanged.
- **Live as demo admin:**
  - The Pending queue shows LS-31 (CO2) with "SDS on file · Manage", Review and Edit.
  - Under All, there are 96 Edit links, 78 cards with an SDS on file and 18 without.
  - Edit opened the LS-31 editor naming the seller. Nothing was saved.
- **Note:** a browser that still had the app's saved sign-in state after the server session ended showed every card as "No SDS". The API correctly treated it as anonymous and returned no documents. Signing in again fixed it. The admin app's client-side session check can disagree with the server session; that is outside this change.

## Fix: admin edits blocked by feedstock state and frequency

- **Reported:** saving a price change on LS-97 (Brine sludge) showed "Choose the feedstock state. Choose the supply frequency." Changing Category did not help.
- **Cause:** the admin editor runs the full submission checks on every save. Those checks require state and frequency, which sit in the Specifications section. The API does not require either field to publish, and 72 of the 73 published listings on development have neither. The message also did not say where the fields were.
- **Fix:**
  - Commit `ad336b6`:
    - For admins, state and frequency are now recommended: an amber "Recommended. Not set yet; saving is still allowed." note appears instead of a block.
    - SDS, price, quantity, MOQ, unit, currency, location, material type, name and category still block, and seller rules are unchanged.
    - Each validation message is a link that scrolls to and focuses its field, and invalid fields get `aria-invalid`.
  - Commit `9d08970` makes the SDS section focusable, which closes Codex's round-1 finding.
- **Review:** Codex reviewed in two rounds and approved.
- **Checks:**

  | Check | Result |
  | --- | --- |
  | Web, admin and test type-checks | Pass |
  | ESLint | Clean |
  | Web library tests | 404/404 (4 new in `listing-form-issues.test.ts`) |
  | Web and admin builds | Pass |

- **Deployed:** web `dpl_5d2iDvqdbR2XCj9scSzH1enVWiS5`, admin `dpl_FuDmpXTcyQnpoef6vx2owytfRjd7`.
- **Live check on LS-97:**
  1. Both "Recommended" hints showed.
  2. Price 99 → Save was blocked only by "Choose a listing category". The listing had no saved category.
  3. The link focused `#category` with `aria-invalid=true`.
  4. With Chemical Byproducts chosen, the save succeeded: published, price 99, category saved.
- **Open:** 71 of the 73 published listings have no saved category, so each one's first admin edit asks for one.
