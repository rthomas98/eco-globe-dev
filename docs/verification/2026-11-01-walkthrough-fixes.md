# Walkthrough fixes — 2026-11-01

Four issues found while checking the user guide in the browser are fixed on development.

| Issue | Fix | Type |
| --- | --- | --- |
| Demo listing descriptions showed the placeholder price to signed-out visitors through the 140-character public preview. | The 55 descriptions EcoGlobe created (44 sample-company listings and 11 FUEL/LSU copies) now begin "Demo listing on the EcoGlobe development site." followed by product and site details. The price and stock note was moved lower, and only the description field was changed. | Data |
| The order menu's "Contact seller" opened an email to EcoGlobe. | Relabelled "Email EcoGlobe about this order" (`buyer-order-detail-panel.tsx`). | Web |
| The sidebar "Switch to Seller" / "Switch to Buyer" was offered to single-role accounts, and the API refused the switch with 403 "This account does not have the requested marketplace role." | New `RoleSwitchMenuItem`, used by the buyer and seller sidebars. It shows "Switch to …" only when the account holds that role and otherwise shows "Add … access", which opens the dashboard chooser and onboarding, as the header menu already did. | Web |
| At 1280px the admin listings table was wider than the content area, so the Actions column was off-screen. | Minimum width reduced from 1080px to 940px, product and seller cells truncated with full-text tooltips, and the Actions column pinned to the right edge (`admin-listings-table.tsx`). | Admin |

## Checks

- **Data:**
  - Dry run first, then applied through the admin API. All 55 descriptions were rewritten with no status changes, and a re-run found nothing left to change.
  - Afterwards, no published listing mentions a price or currency in its first 140 characters.
  - The anonymous API for listing 81 returns a preview that starts with the site and workbook details, and the price stays hidden.
- **Code (commit `51c7faf`):**
  - Web and admin type-checks pass.
  - ESLint reports 0 errors and one `<img>` warning that predates this change.
  - Web library tests pass 404/404, and the web and admin builds pass.
  - Codex reviewed the commit and approved it with no blocking findings.
- **Deployed:** web `dpl_CGpaWfQ4v1MHeLf2JWedAFcdcbrR` and admin `dpl_C47VsS4WS9cABd9QbNYbbWQTBuj3`, both Ready on the production target. The API is unchanged.
- **Live Playwright check at 1280×800:**
  - The demo buyer's menu shows "Add Seller access" and the demo seller's shows "Add Buyer access".
  - The More actions menu on order EG-44 lists Print order, Download invoice PDF, Email EcoGlobe about this order and Report an issue.
  - In the admin listings table the Actions column ends at x=1256 within the 1280px viewport, and the page does not scroll sideways. At 1100px the pinned column stays visible (right edge 1076).
- **User guide:** `docs/guides/EcoGlobe_App_User_Guide.docx` was updated for the new labels. Like the rest of `docs/guides/`, it is not committed.
