# Admin report corrections — 2026-09-21

Source: `Admin Site x EcoGlobe.pdf` (two pages supplied by the user).

## Reproduced in Chrome before changes

- Standalone admin `/admin/lab-testing` and `/admin/document-review` returned 404 after authorized admin login.
- EG-11 showed its actual record above unrelated hardcoded parties, product, lifecycle, documents, and $13,440 financial example.
- Searching admin destinations for `Intelligence` returned no results.
- Seller `Start new agreement` left the page unchanged.

## Changes and local verification

- Added standalone admin routes for lab queue, internal draft panels, and document review.
- Search now derives its destinations and group keywords from the sidebar catalog. Chrome search for Intelligence returns Map Intelligence and the Intelligence group destinations; selecting Map Intelligence navigates successfully.
- Replaced the admin sale example with the saved order and associated shipments, escrow, and payments. Failed loads show a retry state rather than example data.
- EG-11 now consistently shows MKDK Shop, Greenfield Biomass LLC, Guard Test Bagasse, 400 tons, and $24,000. Its effective unit amount is $60/ton (derived from saved subtotal / quantity). Linked ESC-8 is funded; TX-5 is captured. No shipment exists for this order.
- Backend listing checkout computes quantity times listing price and applies eligible sample credit. The order schema has no separate platform fee or shipping component. The UI marks these as not separately recorded instead of inventing fees or recalculating historical totals from current prices.
- Seller agreements now load saved contracts; Start new agreement opens a validated form using an existing seller order's parties and listing. Save creates a draft through the existing tenant-authorized contracts endpoint. It does not send a signature request.
- Chrome saved clearly labeled test draft CT-2 with the seller test account, then refreshed and verified persistence and correct parties.
- Local document review loaded four pending documents and one verified document after restoring the admin session. Lab queue showed its valid empty state; internal panels showed four existing draft families.

Local UI testing used the hosted development backend, not an isolated local database. The nonbinding CT-2 QA draft remains in that backend. Local web/admin share the localhost session-cookie name; sign back into the intended role when switching apps during testing.

## Checks

- Web and admin TypeScript checks passed.
- Admin production build passed.
- Focused web ESLint check and whitespace check run before commit.
- Production Vercel builds and live Chrome regression follow deployment of this commit.

Scope: this report's routes, search, sale detail, and seller draft creation. Existing unrelated portal example dashboards and provider signature setup are outside this change. No document approval, signature request, payment, or shipment mutation was performed.

## Production acceptance

Application commit: `b0cc0b7` (pushed to `codex/deploy-ecoglobe-backend`).

- Admin release: `dpl_7CXkiyeExD3MctkB2k9gugZ1xEy2`, promoted to `https://eco-globe-dev-admin.vercel.app`.
- Marketplace release: `dpl_GRYB9knJU8xXaoKaQZBTZUxV8qAR`, promoted to `https://eco-globe-dev-web.vercel.app`.
- Both Vercel builds succeeded. Existing web lint warnings and the existing Turbo environment declaration warning remain; authenticated backend reads worked in live verification.
- Chrome on live admin: EG-11 has consistent real parties, 400 tons and $24,000; lab queue loads its empty state; draft panels load all four internal draft families; document review loads four pending and one verified item; Intelligence search returns destinations and Map Intelligence navigation succeeds.
- Chrome on live marketplace with Sasha: Start new agreement opens; a clearly labeled nonbinding QA draft CT-3 saves with the correct parties and terms; refreshing preserves it. CT-2 also remains visible. Both QA drafts remain saved, without signature requests.
- Visual inspection of the deployed seller agreement page passed at the existing desktop viewport. These checks do not assert that unrelated portal mockups or external signature providers are complete.
