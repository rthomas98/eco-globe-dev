# EcoGlobe marketplace redesign concepts

Preview concepts only; no live website changes. Generated with the built-in OpenAI image tool; generator model selection is unavailable. All product figures in mockups are illustrative.

## Recommendation
Use Concept A's marketplace structure, Concept B's photography and spacing, and Concept C's comparison tools on browse/results pages.

## Research
- https://dribbble.com/shots/1479800-Amazon-Redesign-Concept — Brad Burke's concept emphasizes easy search, recommendations and focused content blocks. This is design inspiration, not measured conversion evidence.
- https://www.behance.net/gallery/120692683/Amazon-UXUI-Redesign-Case-Study — Luciana Luca's study frames visual hierarchy, unintuitive search and overloaded product details as redesign problems.
- https://seller.alibaba.com/storefront — B2B storefront reference for supplier identity and branded product presentation.

## Proposed homepage structure
1. Persistent search, location, account, orders and cart.
2. Category navigation using existing catalog categories.
3. Compact hero; show materials in the first viewport.
4. Photo category tiles and available material cards.
5. Sample, laboratory and pilot entry points.
6. Request-a-quote panel and seller onboarding.

## Implementation principles
Retain authentication and company access rules. Show prices only when authorized; distinguish sign-in from incomplete onboarding. Keep MOQ, unit, location and document status visible. Never imply verified status without underlying evidence. Use true availability and prices. Personalization appears only when useful history exists. Mobile uses a compact search header, scrollable categories and two-column cards. Keep the map as an optional sourcing tool so it does not dominate the homepage.

## Concept prompts

### A
Use case: ui-mockup. Generate a polished high fidelity desktop homepage screenshot for EcoGlobe, an industrial feedstock marketplace. Concept A: MARKETPLACE FIRST, Amazon-inspired shopping structure but original EcoGlobe branding. Entire flat website screenshot, no device frame, 1440px wide feeling, tall page about 1600px, crisp readable typography. Forest green masthead with white EcoGlobe wordmark, dominant wide search 'Search materials, suppliers, or specifications', location 'Deliver to Houston', Account, Orders, cart icons. Second white category nav Biomass & Wood / Oils / Plastics / Rubber / Industrial / Used Equipment. Compact pale sage hero occupying only 220px, headline 'The right material. Ready for your next move.' button 'Explore materials', right realistic studio photo of wood pellets, bagasse and black rubber granules in separated piles. Next a horizontal row of six photo category tiles. Next headline 'Explore available materials' and 4 coherent commerce cards with beautiful material photography, names Wood Pellets, Sugar Bagasse, Used Cooking Oil, Tire Crumb Rubber; location, price $230/t $80/t $1,300/t $180/t respectively, MOQ, 'View details' button. Price and small line 'Example listing' on every card. Bottom two helpful promo panels 'Start with a sample' and 'Need a specific material? Request a quote'. Clean white and warm gray canvas, forest green action color, subtle pale yellow accent. Compact functional professional shopping UI, consistent grid. No Amazon logos, star ratings, invented trust numbers, discount promises or verified claims. Small top annotation 'CONCEPT A · MARKETPLACE FIRST'. All figures illustrative.

### B
Use case: ui-mockup. Generate a beautiful high fidelity desktop homepage screenshot for EcoGlobe industrial material marketplace. Concept B: MATERIALS GALLERY. Flat UI screenshot, no device frame, tall page, 1440px desktop feeling. Distinct premium editorial ecommerce design, warm off-white canvas, large near-black typography, restrained emerald highlights, thin borders. White header EcoGlobe logo left, Materials / How it works / Sell materials, compact Account/cart right; full width search row below 'What material do you need?' and 'Location'. Asymmetric hero left 45 percent typographic headline 'Good materials. New possibilities.' short line 'Source feedstocks and surplus materials for your next production run.' small dark green Browse materials button; right 55 percent premium macro photograph of golden wood fibers and dark biochar divided organically, no leaves or generic sustainability cliches. Under hero large visual category mosaic 3 equal columns: Biomass & Wood with pale fibers, Oils & Liquids amber liquid, Recovered Materials black rubber granules. Then 'Materials worth a closer look' 4 elegant white product cards with realistic isolated studio material photos, names Rice Hull Ash / Biochar / Wood Pellets / Sugar Bagasse, prices $250/t / $500/t / $230/t / $80/t; all labeled Example listing, small location, MOQ, View material link. Footer band 'Discover. Sample. Test. Source.' sophisticated simple icons. Show polished typography and generous whitespace but enough product density for real shopping. No fabricated certifications, star ratings or sustainability claims. Small top annotation 'CONCEPT B · MATERIALS GALLERY'.

### C
Use case: ui-mockup. Create a high fidelity desktop EcoGlobe homepage concept screenshot C PROCUREMENT DESK, an original industrial B2B ecommerce marketplace, flat website screenshot no device frame. 1440px wide desktop feeling, tall page. Compact dark ink header EcoGlobe white wordmark, huge search field 'Search by material, grade, or supplier', account/orders/cart. Palette white light gray, emerald green, restrained amber. Second nav All categories / Available materials / Request a quote / Samples / Help. Main content begins modest headline 'Find the right supply for your operation.' Below a horizontal sourcing bar Material / Delivery location / Quantity / Search materials green button. Left narrow category rail with Biomass & Wood, Oils & Liquids, Plastics, Rubber, Industrial, Used equipment. Main middle wide area 'Available materials' three rich photo product cards with name, price per tonne, minimum order, location and 'Compare' checkbox and View details: Wood Pellets $230/t, Sugar Bagasse $80/t, Tire Crumb $180/t. Label all Example listing. Right narrower integrated card 'Source by location' with attractive real-looking stylized geographic map Houston region, thin green radius and three neutral dots, 'Open map' link, below a panel 'Can’t find your specification?' 'Request a quote'. Bottom wide second row 'Compare the details before you buy' mini comparison table columns material, grade, MOQ, location, documents with truthful neutral 'View documents' links. Bottom three concise steps Request sample / Arrange testing / Plan a pilot. Enterprise confidence meets ecommerce, clear visual hierarchy, practical dense information, beautiful material photos, no fake verified badges, ratings, customer counts, discounts or delivery promises. Top small annotation 'CONCEPT C · PROCUREMENT DESK'.


## Final revision applied to all concepts
Preserve the original EcoGlobe SVG logotype and existing black, white and neutral gray UI colors. Retain full-color photography. Add country-based materials discovery, clearly marked as a concept and supplier locations rather than shipping routes. The first prompts above describe superseded color exploration; the three saved PNGs are the final brand-preserving versions.

## Interactive map
Country/material selection tested in Chrome: Rubber selects Japan; Mexico displays Biochar and Wood Pellets. Data is a selected snapshot from the reviewed live catalog, not a live API connection. Geographic boundaries: world-atlas 2.0.2 countries-110m (Natural Earth); country-level centroids projected with d3-geo.
