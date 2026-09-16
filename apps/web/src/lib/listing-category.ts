/** Legacy listings have broad material types; discovery also groups their material names. */
export function matchesListingCategory(listing: { category: string; title: string; materialTypeCode?: string | null }, selected: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalize(listing.category) === normalize(selected)) return true;
  const title = listing.title.toLowerCase();
  switch (normalize(selected)) {
    case "usedproducts": return listing.materialTypeCode === "used_product";
    case "oilsliquidfeedstocks": return /\b(oil|uco|liquid)\b/.test(title);
    case "biomasswood": return /\b(wood|biomass|bagasse|stover|husk|hull|biochar|hydrochar)\b/.test(title);
    case "rubbertirederived": return /\b(rubber|tire|tyre)\b/.test(title);
    case "plastics": return /\b(plastic|polymer|polypropylene|polyethylene)\b/.test(title);
    case "chemicalbyproducts": return /\b(epoxy|chemical)\b/.test(title);
    case "refinerybyproducts": return /\b(pitch|tar|refinery)\b/.test(title);
    default: return false;
  }
}
