# Ana feedstock pictures

Illustrative fallback images for listings whose seller has not uploaded a photo. The images come from Ana's deck "Feedstocks with pictures.pptx" (intake on 2026-10-15).

## Where things live

- Assets: `apps/web/public/images/materials/ana/*.webp`, 31 files. Each is 1200×800 WebP (quality 84), about 6.5 MB in total, made from the deck's original PNGs.
- Resolver: `apps/web/src/lib/material-images.ts` (`ANA_MATERIAL_IMAGES`).
- Tests: `apps/web/src/lib/material-images.test.ts`.
- Intake manifest, with source and output SHA-256 for every file: `.local/verification/2026-10-15-picture-intake/approved-mapping.json` in the primary checkout. It is private and not committed.

## Rules

- **Exact names only.** A listing title gets an Ana picture only when, after trimming and ignoring case, it equals one of the confirmed material names. The names come from slide captions; a few spelling variants are also confirmed (for example `CO2`/`CO₂` and `H2S`/`H₂S`). Slide headings, single caption fragments, categories and partial words are never matched.
- **Seller photos win.** Listing views use uploaded photos first. They fall back to the resolver only when no photo exists or a photo fails to load.
- **Always labeled.** Every Ana path is under `/images/materials/`. The UI therefore shows the "Illustrative image" caption and "Illustrative image of …" alt text, exactly as it does for earlier fallbacks.
- **Overlaps.** The legacy fallbacks Pyrolysis Pitch, Black Gypsum, Biochar, Hydrochar and Epoxy Off-Spec now resolve to the Ana pictures. All other earlier fallbacks are unchanged.

## Not mapped

- **Synthetic graphene:** held until Ana confirms the graphite image. That source image is unused.
- **No new picture in the deck:** off-spec carbon black, used wooden pallets, used cooking oil (UCO), used dry-type transformers and CO₂-derived ethanol. Existing artwork such as `Used Pallets`, `Refined Used Cooking Oil (UCO)` and `Used Dry Transformer` stays in place.

To add or change a name, update `ANA_MATERIAL_IMAGES` and the matching expectation in the test together. Never derive a name from research records or from the picture itself.
