const MATERIAL_IMAGES: Record<string, string> = {
  "Premium Rice Hull Ash": "/images/materials/rice-hull-ash-illustrative.png",
  "Gasoline offspec": "/images/materials/gasoline-offspec-illustrative.png",
  "Guard Test Bagasse": "/products/generated/bagasse.png",
  "Pyrolysis Pitch": "/products/generated/pyrolysis.png",
  "Epoxy Off-Spec": "/products/generated/epoxy-offspec.png",
  "Shredded, Refined Sugar Bagasse": "/products/generated/bagasse.png",
  "Scrap Polymer Blend with Impurities": "/products/generated/polymer.png",
  "Black Gypsum": "/products/generated/black-gypsum.png",
  "Harvested and Baled Corn Stover": "/products/generated/stover-walker.png",
  "Biomass Wood Pellets, Grade A": "/products/generated/wood-pellets.png",
  "Industrial By-Product: Rice Husk": "/products/generated/rice-husk.png",
  "Certified Organic Wood Chips": "/products/generated/wood-chips.png",
  "Recycled Tire Crumb Rubber": "/products/generated/tire-crumb.png",
  "Refined Used Cooking Oil (UCO)": "/products/generated/used-cooking-oil.png",
  "Used Dry Transformer": "/products/generated/used-dry-transformer.png",
  Hydrochar: "/products/generated/hydrochar.png",
  "Used Pallets": "/products/generated/used-pallets.png",
  Biochar: "/products/generated/biochar.png",
  "White Label": "/products/generated/white-label.png",
  Tar: "/products/generated/tar.png",
  "Dark Viscous Liquid Tonnels": "/products/generated/dark-viscous-liquids.png",
};

// Ana's feedstock picture deck: exact material names transcribed from slide
// captions. These take precedence over overlapping MATERIAL_IMAGES entries.
// Synthetic graphene is held pending Ana's confirmation of its image.
const ANA_MATERIAL_IMAGES: Record<string, readonly string[]> = {
  "/images/materials/ana/aromatic-tars.webp": [
    "Pyrolysis pitch / steam-cracker tar",
    "Pyrolysis pitch",
    "Steam-cracker tar",
    "Phenol tar",
    "Quench oil",
    "Pyrolysis gas oil",
    "Resin oil",
  ],
  "/images/materials/ana/sulfuric-acid.webp": [
    "Spent sulfuric acid",
    "Non-prime sulfuric acid",
  ],
  "/images/materials/ana/spent-caustic.webp": [
    "Spent caustic (sodium hydroxide)",
  ],
  "/images/materials/ana/black-gypsum.webp": ["Black gypsum"],
  "/images/materials/ana/bagasse-boiler-ash.webp": ["Bagasse boiler ash"],
  "/images/materials/ana/mineral-slurry.webp": [
    "Alumina trihydrate (ATH)",
    "Spent vibratory finishing media",
    "Sodium aluminate",
  ],
  "/images/materials/ana/biochar-hydrochar.webp": ["Biochar", "Hydrochar"],
  "/images/materials/ana/edc-heavy-ends.webp": ["EDC heavy ends"],
  "/images/materials/ana/pdc-bottoms.webp": ["PDC bottoms"],
  "/images/materials/ana/spent-h2s-scavenger.webp": [
    "Spent H₂S scavenger",
    "Spent H2S scavenger",
    "Spent H2S scavenger (amine-based)",
  ],
  "/images/materials/ana/expired-chemicals.webp": [
    "Expired chemicals (unopened)",
    "Expired chemicals",
  ],
  "/images/materials/ana/phenolic-extender.webp": [
    "Liquid Phenolic Extender (LPE-90)",
    "LPE-90 (Liquid Phenolic Extender)",
    "Liquid Phenolic Extender (LPE-90, phenol bottoms)",
  ],
  "/images/materials/ana/offspec-epoxy.webp": [
    "Off-spec epoxy",
    "Epoxy Off-Spec",
  ],
  "/images/materials/ana/cured-resin.webp": ["Solid (cured) resin"],
  "/images/materials/ana/polyester-fiber.webp": [
    "Polyester nonwoven fiber",
    "Polyester nonwoven fiber broke (MemBase line)",
  ],
  "/images/materials/ana/mixed-plastics.webp": ["Mixed plastics"],
  "/images/materials/ana/fiberglass.webp": ["Fiberglass"],
  "/images/materials/ana/waxes.webp": ["Polyethylene wax", "Waste waxes"],
  "/images/materials/ana/wood-scrap.webp": ["Wood", "Used wood"],
  "/images/materials/ana/cardboard-pressboard.webp": ["Cardboard / pressboard"],
  "/images/materials/ana/biomass-residues.webp": [
    "Wood chips, sawdust and agricultural residues",
    "sawdust and agricultural residues",
  ],
  "/images/materials/ana/wastewater-sludge.webp": [
    "Wastewater treatment sludge",
    "Waste water treatment sludge",
    "Biosolids",
  ],
  "/images/materials/ana/brine-sludge.webp": [
    "Brine sludge",
    "Desalter brine",
    "Desalter brine and wastewater",
  ],
  "/images/materials/ana/contact-water.webp": [
    "Contact water",
    "Contact water (process storm water)",
    "Water with dielectric oil traces",
  ],
  "/images/materials/ana/offspec-naphtha.webp": [
    "Off-spec naphtha / naphtha slops",
    "Off-spec naphtha",
    "Off-spec Naphta",
    "Naphtha slops",
  ],
  "/images/materials/ana/carbon-dioxide.webp": ["CO₂", "CO2", "High-purity CO2"],
  "/images/materials/ana/green-hydrogen.webp": ["Green hydrogen"],
  "/images/materials/ana/used-uniforms.webp": ["Used uniforms"],
  "/images/materials/ana/geopolymer-cement.webp": ["Geopolymer cement"],
  "/images/materials/ana/co2-derived-propylene.webp": [
    "CO₂-derived propylene",
    "CO2-derived propylene",
    "Propylene (CO2-derived)",
  ],
  "/images/materials/ana/co2-derived-acrylonitrile.webp": [
    "CO₂-derived acrylonitrile",
    "CO2-derived acrylonitrile",
    "CO2-derived acrylonitrile (ACN)",
    "Acrylonitrile (CO2-derived)",
  ],
};

const ANA_ALIASES = new Map(
  Object.entries(ANA_MATERIAL_IMAGES).flatMap(([src, aliases]) =>
    aliases.map((alias) => [alias.toLowerCase(), src] as const),
  ),
);

export function materialImage(title: string): string | null {
  const normalized = title.trim().toLowerCase();
  const ana = ANA_ALIASES.get(normalized);
  if (ana) return ana;
  const exact = Object.entries(MATERIAL_IMAGES).find(
    ([name]) => name.toLowerCase() === normalized,
  )?.[1];
  if (exact) return exact;
  // Explicit known local fixture names, never guess a material from its category.
  if (/^(updated )?gasoline offspec(?: draft| [a-f0-9]+)?$/.test(normalized))
    return "/images/materials/gasoline-offspec-illustrative.png";
  return null;
}
export function isMaterialIllustration(src: string | null | undefined) {
  return (
    !!src &&
    (src.startsWith("/products/") || src.startsWith("/images/materials/"))
  );
}
