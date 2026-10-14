# Internal material reference intake

The user approved keeping the 29 PDFs from `SDS.zip` as internal research references. These compiled reference documents are not completed supplier SDSs. They must not satisfy checkout or RFQ document requirements or verify company, facility, composition, price or volume data.

## Implementation and intake

The additive library stores immutable original PDF bytes and their SHA-256 hashes separately from listing and company documents. Admin users can upload, search and download references, and link them to internal market records. The browser upload limit is 3 MiB to fit the hosted JSON proxy; the direct backend limit is 5 MiB. Duplicate content returns the existing reference ID without creating another document.

Imported all 29 original PDFs, covering 107 pages and 412,559 bytes. Twenty-three files have 94 links based on material context across 93 existing internal market records. Six files remain unlinked because their context does not establish a reliable research-record match.

`Black_Gypsum_DG_Reference.pdf` describes a gypsum/humate soil amendment and must remain separate from industrial carbon-black-plant black gypsum. The sugarcane bagasse ash reference does not cover rice hull ash. The archive contains no PVC Scrap or Premium Rice Hull Ash supplier SDS.

No PDF content, source workbook, credentials or private intake catalog belongs in Git. Private evidence is under `.local/verification/2026-10-14-sds-intake/`.

## Verification status

Implementation and reciprocal review are complete. Exactly 26 reviewed source files were integrated, preserving the existing fixes. Combined checks passed: 116 backend tests, 160 frontend helper tests, runtime and SQL ownership checks, workspace types, lint and the backend build. Both combined web and admin builds passed in the approved source-only external build directory after the internal-disk ENOSPC failure.

The additive development migration created the two reference tables. Before and after counts match: 40 companies, 39 locations, 27 listings, 28 orders, 41 users, 155 market records and 8 listing documents. Migration SHA-256: `ef9dc24b18b63a72a0128489173e6c4b93f578d52a98ff16ab6c97d57136c751`.

React Doctor completed with one pre-existing false positive on local response-header removal and ten advisory warnings; source review found no substantive new defect.

Live development acceptance completed on 2026-10-14:

- The standalone admin browser uploaded Biochar reference #1, validated required fields and disabled all inputs during saving. Both admin surfaces downloaded the original PDF with the expected SHA-256.
- The main web browser rejected a duplicate with existing reference #1 and kept the total at 29. Record #53 displays its linked reference; the library filter, search, unlinked Black Gypsum notes and reload persistence work.
- At 390 × 844, the library has `scrollWidth === innerWidth === 390`.
- Anonymous callers receive 401; buyer and seller callers receive 403 for listing, download and malformed upload requests. Both frontend proxies preserve authenticated PDF security headers and withhold bearer tokens from login JSON. Browser portal guards deny buyer and seller access.
- All 29 backend downloads match the original bytes. Responses preserve PDF attachment filenames, CSP sandbox, nosniff and private/no-store headers.
- Actual Azure SQL reconciliation confirms 29 references, 94 links, 93 linked records, six unlinked files, 412,559 original bytes and 29 reference audit records.
- The existing 27 owned listings, 142 active market records and eight listing documents match the pre-intake API snapshot exactly. Biochar #17 and Rice Hull Ash #22 retain their SDS purchase blocks. PVC Scrap #27 retains its existing `SDS044_PSK_PVC.pdf` and enabled Buy Now button. Purchase-gate checks used read-only buyer views.

## Development release

Source commit: `231e4f87eb577d2b0408f726c0931a31728b73c3`.

- API revision: `ecoglobe-backend-dev--references-231e4f8`; healthy and ready.
- Backend image digest: `sha256:1c46f008c34a1230389d364c9b097534dea3574578ee217058a2ee6827d87499`.
- [Web development site](https://eco-globe-dev-web.vercel.app): `dpl_7R5GUJR5Q4QEgh3DBRZKF38X21To`.
- [Admin reference library](https://eco-globe-dev-admin.vercel.app/admin/market-records/references): `dpl_23PEkeoiPi4vW4f7wTUU1FcjMgJE`.

Only application source and generated build/release artifacts used the approved external-drive directory. Intake PDFs, credentials and private verification evidence stayed in their existing internal locations. Final manifests and acceptance receipts are in the private evidence directory above.

## Retest steps

1. Sign in to the development admin portal and open **Market records → Reference library**.
2. Search by material, original filename or notes. Download an original reference PDF.
3. Open an associated market record and inspect its **Reference PDFs** section.
4. Uploading the same PDF must identify the existing reference and add nothing.
5. Buyer, seller and anonymous sessions must not access the library or its downloads.

Supplier SDSs remain a separate seller requirement. Research references do not resolve the missing facility data or shipping/provider dependencies.
