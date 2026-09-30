# Order photos API contract

`GET /api/orders` and `GET /api/orders/:id` return `listingImageUrl: string | null` alongside `listingId` and `listingTitle`.

The value comes from the first nondeleted `photo` document for the order's saved `ListingId`, ordered by document ID. Documents with no content and no nonblank URL are excluded. SDS and other document types are excluded.

- Stored bytes return `/api/listing-documents/{id}/download`.
- Legacy documents return their saved `FileUrl`.
- A listing with no photo returns `null`.

This reads the listing's current photo; it does not snapshot the photo at purchase or infer an image from the product name/category. Existing order and document access rules are preserved. A download URL does not grant access to a private listing.

The buyer web portal validates the reference, accepts the download path or a credential-free HTTPS URL, and sends download paths through the existing same-origin `/api/backend` session proxy. Both My Orders and order detail use the same mapping. The product title supplies alt text. Missing or failed images display an accessible “No photo available” state.
