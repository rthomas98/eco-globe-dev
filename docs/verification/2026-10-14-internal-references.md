# Internal material reference intake

The user approved keeping the 29 PDFs from `SDS.zip` as internal research references. These compiled reference documents are not completed supplier SDSs. They must not satisfy checkout or RFQ document requirements or verify company, facility, composition, price or volume data.

## Implementation and intake

The additive library stores immutable original PDF bytes and their SHA-256 hashes separately from listing and company documents. Admin users can upload, search and download references, and link them to internal market records. The browser upload limit is 3 MiB to fit the hosted JSON proxy; the direct backend limit is 5 MiB. Duplicate content returns the existing reference ID without creating another document.

The reviewed intake plan covers 29 original PDFs, 107 pages and 412,559 bytes. It proposes 94 material-context associations across 93 existing internal market records for 23 files. Six files remain unlinked because their context does not establish a reliable research-record match.

`Black_Gypsum_DG_Reference.pdf` describes a gypsum/humate soil amendment and must remain separate from industrial carbon-black-plant black gypsum. The sugarcane bagasse ash reference does not cover rice hull ash. The archive contains no PVC Scrap or Premium Rice Hull Ash supplier SDS.

No PDF content, source workbook, credentials or private intake catalog belongs in Git. Private evidence is under `.local/verification/2026-10-14-sds-intake/`.

## Verification status

Implementation and reciprocal review are complete. Exactly 26 reviewed source files were integrated, preserving the existing fixes. Combined checks passed: 116 backend tests, 160 frontend helper tests, runtime and SQL ownership checks, workspace types, lint and the backend build. Both combined web and admin builds passed in the approved source-only external build directory after the internal-disk ENOSPC failure.

The additive development migration created the two reference tables. Before and after counts match: 40 companies, 39 locations, 27 listings, 28 orders, 41 users, 155 market records and 8 listing documents. Migration SHA-256: `ef9dc24b18b63a72a0128489173e6c4b93f578d52a98ff16ab6c97d57136c751`.

React Doctor completed with one pre-existing false positive on local response-header removal and ten advisory warnings; source review found no substantive new defect.

Deployment and the approved PDF intake remain pending live acceptance. This checkpoint does not certify completed ingestion or browser verification.

## Retest steps

1. Sign in to the development admin portal and open **Market records → Reference library**.
2. Search by material, original filename or notes. Download an original reference PDF.
3. Open an associated market record and inspect its **Reference PDFs** section.
4. Uploading the same PDF must identify the existing reference and add nothing.
5. Buyer, seller and anonymous sessions must not access the library or its downloads.

Supplier SDSs remain a separate seller requirement. Research references do not resolve the missing facility data or shipping/provider dependencies.
