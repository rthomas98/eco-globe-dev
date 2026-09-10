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

export function materialImage(title: string): string | null {
  const normalized = title.trim().toLowerCase();
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
