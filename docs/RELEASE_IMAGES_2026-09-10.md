# Marketplace images and navigation release

Application commit: `96fa0c5`, pushed to `origin/codex/deploy-ecoglobe-backend` at the user's request.

Restores material artwork, adds rice hull ash and gasoline illustrations, applies image fallback to cart thumbnails, and gives Tracker, Samples and Pilots distinct icons. Seller images retain priority. Unknown synthetic materials retain an empty state.

Validation: repository type checks passed; web ESLint reported no errors; production web and admin builds passed. Existing image optimization warnings remain. Local browser verified product and cart images and navigation icons. React Doctor was unavailable because npm DNS resolution failed.

Both Vercel production candidates were built from a clean Git archive and promoted:
- Web: `dpl_PqL5GDwTNdRGbqP8KKPsQrWSk8zP`, https://eco-globe-dev-web.vercel.app
- Admin: `dpl_4t7pNGzgx9Zhax1s7SGF1MHWVPH8`, https://eco-globe-dev-admin.vercel.app

Both live backend health proxies returned HTTP 200 with SQL connected. The two generated assets returned HTTP 200 and their SHA-256 digests matched committed files. The live public catalogue rendered 21 listings; browser inspection confirmed rice hull ash and restored catalogue imagery. The existing Phase 1 Smoke Feedstock synthetic record has no usable material image.

No backend deployment, migration, or live database mutation was needed. The separately authorized closure of local synthetic sample listings 1011 and 1012 preserved their records and was not a production data change. Production authenticated workflows were not rerun; this release used local browser evidence and live public/health checks.

This documentation-only follow-up does not change deployed application source.
