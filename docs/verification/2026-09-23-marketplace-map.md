# Marketplace city-radius correction — 2026-09-23

Source: Ecoglobe Marketplace Site Buyer,Seller and Admin Test Result.pdf. The report marks the other retests settled; its outstanding map issue names Premium Rice Hull Ash (22) and Guard Test Bagasse (21).

## Reproduction

Chrome, live https://eco-globe-dev-web.vercel.app/browse: selecting either listing showed the missing-coordinate notice and failed to center the radius on Baton Rouge. Both listings lack facility coordinates. Their legacy country value is `70`.

## Change

Public and buyer browse maps resolve a selected unlocated listing to a unique city/region reference. Valid country codes constrain lookup; legacy invalid codes require a region and a globally unique city/region match. Unknown or ambiguous matches produce no pin. The map and popup explicitly identify city approximations. Exact facility coordinates, shipping addresses, carbon calculations, and database records are unchanged.

City reference data: https://github.com/lutangar/cities.json, derived from GeoNames, CC BY 4.0. Package version 1.1.61, unmodified. The dataset is accessed by the server route only; the client receives one location. Attribution is visible beside the approximate-location notice.

Changing the radius retains the selected listing in both portals. With radius off, the map retains the selected location rather than fitting every global listing.

## Verification

- Chrome live reproduction for both reported materials.
- Local Chrome public browse: Rice Hull Ash, 5-mile Baton Rouge circle and approximate notice; Bagasse, 25-mile circle; switch to Tar restores exact-location behavior and removes approximate notice.
- Local Chrome buyer browse signed in as Bianca: Rice Hull Ash at 2 miles; Bagasse at 100 and 10 miles; selection retained when radius changes.
- Local Chrome public browse: radius Off removes the circle and retains the Baton Rouge pin.
- City lookup tests: state abbreviation/full name, legacy country, missing region, contradictory valid country, ambiguous city, unknown city.
- TypeScript: passed. Focused ESLint: passed; existing public browse image warning remains.
- React Doctor: no correctness errors; three complexity warnings in existing large browse/map components (72/100).

No production deployment performed in this task. No listing data was mutated.
