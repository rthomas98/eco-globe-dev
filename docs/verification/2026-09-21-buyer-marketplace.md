# Buyer marketplace corrections — 21 September 2026

Source: Buyer New Bug EcoGlobe.pdf, four reported issues.

## Reproduction on hosted site

Tested in Chrome at https://eco-globe-dev-web.vercel.app/browse using the existing Bianca buyer test account.

- Fresh buyer sign-in showed all 21 listings with prices. The reported $40–$60 range returned four listings (Guard Test Bagasse, Certified Organic Wood Chips, Black Gypsum, Phase 1 Smoke Feedstock). Kate's account was not available for account-specific reproduction.
- Clicking Guard Test Bagasse silently left the map unchanged because that listing has no saved coordinates.
- Radius rendering disappeared during selection; the component removed and recreated its GeoJSON source whenever the listing array changed.
- Public browse trusted cached profile information for its signed-in header, while pricing authorization was determined by the backend. Public listing loads did not refresh the session.
- The Where search filtered location text but did not use the matching recorded location for the map center.

## Changes

- Refresh existing sessions before loading listings and on window focus. Clear cached identity only on an explicit 401; surface network failures instead of treating them as logout.
- Explain company setup requirements for authenticated teaser listings. Disable price controls with an explanation when pricing is redacted, rather than returning a misleading empty result.
- Remove the hardcoded price histogram; retain numeric price range inputs.
- Keep radius GeoJSON sources mounted and update their data. Frame a selected listing's circle and popup together.
- Provide a buyer Show on map action rather than moving the camera on incidental hover.
- Explain missing coordinates rather than inventing a seller's location. Provide an explicit map-center fallback when viewer location is unavailable.
- Center location searches on matching persisted listing coordinates. Keep search inputs and radius synchronized with navigation.

## Local Chrome checks

- Buyer Tar selection: correct $225/t popup and 2-mile circle around Houston.
- Public Tar selection: correct popup and 5-mile circle.
- Missing-coordinate selection: visible explanatory notice.
- No viewer location: explicit map-center action establishes a radius.
- Houston location search: matching listing results and radius centered on Houston.
- Price range 40–60: the four expected listings, including the $60 boundary.
- Signed-out browse: 21 teaser listings, Login link, disabled price controls with explanation.
- No browser console errors during these local checks.
- TypeScript checks passed; targeted lint had no errors (existing raw logo image warning).

No database values, seller coordinates, memberships, or pricing permissions were changed. Local UI tests used the existing hosted development API. Real financial actions were not performed.
