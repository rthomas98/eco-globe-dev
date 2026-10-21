import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isMaterialIllustration, materialImage } from "./material-images.ts";

const publicDir = fileURLToPath(new URL("../../public", import.meta.url));
const ana = (slug: string) => `/images/materials/ana/${slug}.webp`;

// Exact material names from Ana's deck and the file each one resolves to.
const ANA_ALIASES: Record<string, string> = {
  "Pyrolysis pitch / steam-cracker tar": ana("aromatic-tars"),
  "Pyrolysis pitch": ana("aromatic-tars"),
  "Steam-cracker tar": ana("aromatic-tars"),
  "Phenol tar": ana("aromatic-tars"),
  "Quench oil": ana("aromatic-tars"),
  "Pyrolysis gas oil": ana("aromatic-tars"),
  "Resin oil": ana("aromatic-tars"),
  "Spent sulfuric acid": ana("sulfuric-acid"),
  "Non-prime sulfuric acid": ana("sulfuric-acid"),
  "Spent caustic (sodium hydroxide)": ana("spent-caustic"),
  "Black gypsum": ana("black-gypsum"),
  "Bagasse boiler ash": ana("bagasse-boiler-ash"),
  "Sugarcane bagasse ash": ana("bagasse-boiler-ash"),
  "Alumina trihydrate (ATH)": ana("mineral-slurry"),
  "Spent vibratory finishing media": ana("mineral-slurry"),
  "Sodium aluminate": ana("mineral-slurry"),
  Biochar: ana("biochar-hydrochar"),
  Hydrochar: ana("biochar-hydrochar"),
  "EDC heavy ends": ana("edc-heavy-ends"),
  "PDC bottoms": ana("pdc-bottoms"),
  "Spent H₂S scavenger": ana("spent-h2s-scavenger"),
  "Spent H2S scavenger": ana("spent-h2s-scavenger"),
  "Spent H2S scavenger (amine-based)": ana("spent-h2s-scavenger"),
  "Expired chemicals (unopened)": ana("expired-chemicals"),
  "Expired chemicals": ana("expired-chemicals"),
  "Liquid Phenolic Extender (LPE-90)": ana("phenolic-extender"),
  "LPE-90 (Liquid Phenolic Extender)": ana("phenolic-extender"),
  "Liquid Phenolic Extender (LPE-90, phenol bottoms)": ana("phenolic-extender"),
  "Off-spec epoxy": ana("offspec-epoxy"),
  "Epoxy Off-Spec": ana("offspec-epoxy"),
  "Solid (cured) resin": ana("cured-resin"),
  "Polyester nonwoven fiber": ana("polyester-fiber"),
  "Polyester nonwoven fiber broke (MemBase line)": ana("polyester-fiber"),
  "Mixed plastics": ana("mixed-plastics"),
  Fiberglass: ana("fiberglass"),
  "Polyethylene wax": ana("waxes"),
  "Waste waxes": ana("waxes"),
  Wood: ana("wood-scrap"),
  "Used wood": ana("wood-scrap"),
  "Cardboard / pressboard": ana("cardboard-pressboard"),
  "Wood chips, sawdust and agricultural residues": ana("biomass-residues"),
  "sawdust and agricultural residues": ana("biomass-residues"),
  "Wastewater treatment sludge": ana("wastewater-sludge"),
  "Waste water treatment sludge": ana("wastewater-sludge"),
  Biosolids: ana("wastewater-sludge"),
  "Brine sludge": ana("brine-sludge"),
  "Desalter brine": ana("brine-sludge"),
  "Desalter brine and wastewater": ana("brine-sludge"),
  "Contact water": ana("contact-water"),
  "Contact water (process storm water)": ana("contact-water"),
  "Water with dielectric oil traces": ana("contact-water"),
  "Off-spec naphtha / naphtha slops": ana("offspec-naphtha"),
  "Off-spec naphtha": ana("offspec-naphtha"),
  "Off-spec Naphta": ana("offspec-naphtha"),
  "Naphtha slops": ana("offspec-naphtha"),
  "CO₂": ana("carbon-dioxide"),
  CO2: ana("carbon-dioxide"),
  "High-purity CO2": ana("carbon-dioxide"),
  "Captured CO2": ana("carbon-dioxide"),
  "Green hydrogen": ana("green-hydrogen"),
  "Used uniforms": ana("used-uniforms"),
  "Geopolymer cement": ana("geopolymer-cement"),
  "Geopolymer / alkali-activated construction and infrastructure material": ana("geopolymer-cement"),
  "Geopolymer / alkali-activated well cement": ana("geopolymer-cement"),
  "Geopolymer construction / pipe-rehab material": ana("geopolymer-cement"),
  "Geopolymer well cement": ana("geopolymer-cement"),
  "CO₂-derived propylene": ana("co2-derived-propylene"),
  "CO2-derived propylene": ana("co2-derived-propylene"),
  "Propylene (CO2-derived)": ana("co2-derived-propylene"),
  "CO₂-derived acrylonitrile": ana("co2-derived-acrylonitrile"),
  "CO2-derived acrylonitrile": ana("co2-derived-acrylonitrile"),
  "CO2-derived acrylonitrile (ACN)": ana("co2-derived-acrylonitrile"),
  "Acrylonitrile (CO2-derived)": ana("co2-derived-acrylonitrile"),
};

// Prior fallbacks that Ana's deck does not replace.
const RETAINED: Record<string, string> = {
  "Premium Rice Hull Ash": "/images/materials/rice-hull-ash-illustrative.png",
  "Gasoline offspec": "/images/materials/gasoline-offspec-illustrative.png",
  "Guard Test Bagasse": "/products/generated/bagasse.png",
  "Shredded, Refined Sugar Bagasse": "/products/generated/bagasse.png",
  "Scrap Polymer Blend with Impurities": "/products/generated/polymer.png",
  "Harvested and Baled Corn Stover": "/products/generated/stover-walker.png",
  "Biomass Wood Pellets, Grade A": "/products/generated/wood-pellets.png",
  "Industrial By-Product: Rice Husk": "/products/generated/rice-husk.png",
  "Certified Organic Wood Chips": "/products/generated/wood-chips.png",
  "Recycled Tire Crumb Rubber": "/products/generated/tire-crumb.png",
  "Refined Used Cooking Oil (UCO)": "/products/generated/used-cooking-oil.png",
  "Used Dry Transformer": "/products/generated/used-dry-transformer.png",
  "Used Pallets": "/products/generated/used-pallets.png",
  "White Label": "/products/generated/white-label.png",
  Tar: "/products/generated/tar.png",
  "Dark Viscous Liquid Tonnels": "/products/generated/dark-viscous-liquids.png",
  "Updated Gasoline offspec draft": "/images/materials/gasoline-offspec-illustrative.png",
  "gasoline offspec 1a2b": "/images/materials/gasoline-offspec-illustrative.png",
};

test("every confirmed Ana material name resolves to its deck picture", () => {
  for (const [title, src] of Object.entries(ANA_ALIASES)) {
    assert.equal(materialImage(title), src, title);
  }
});

test("Ana names keep the existing trim and case-insensitive matching", () => {
  assert.equal(materialImage("  BLACK GYPSUM "), ana("black-gypsum"));
  assert.equal(materialImage("spent h₂s scavenger"), ana("spent-h2s-scavenger"));
  assert.equal(materialImage("co2"), ana("carbon-dioxide"));
});

test("overlapping legacy titles now use the Ana deck pictures", () => {
  assert.equal(materialImage("Pyrolysis Pitch"), ana("aromatic-tars"));
  assert.equal(materialImage("Black Gypsum"), ana("black-gypsum"));
  assert.equal(materialImage("Biochar"), ana("biochar-hydrochar"));
  assert.equal(materialImage("Hydrochar"), ana("biochar-hydrochar"));
  assert.equal(materialImage("Epoxy Off-Spec"), ana("offspec-epoxy"));
});

test("fallbacks without a new Ana picture are unchanged", () => {
  for (const [title, src] of Object.entries(RETAINED)) {
    assert.equal(materialImage(title), src, title);
  }
});

test("held, missing-picture, partial and unknown names get no Ana picture", () => {
  for (const title of [
    "Synthetic graphene",
    "Graphene",
    "Graphite",
    "Off-spec carbon black",
    "Used wooden pallets",
    "Used cooking oil (UCO)",
    "Used dry-type transformers",
    "CO₂-derived ethanol",
    "CO2-derived ethanol",
    "Heavy aromatics, tars & pitch",
    "Propylene",
    "Acrylonitrile",
    "Water",
    "Naphta",
    "Sludge",
    "Acid",
    "Black gypsum blend",
    "Used wood pallets",
    "Biochar pellets",
    "Wood chips",
    "",
    "   ",
  ]) {
    assert.equal(materialImage(title), null, title);
  }
});

test("Ana pictures stay labeled as illustrative", () => {
  for (const src of new Set(Object.values(ANA_ALIASES))) {
    assert.equal(isMaterialIllustration(src), true, src);
  }
  assert.equal(isMaterialIllustration("/api/backend/api/listing-documents/42/download"), false);
});

test("every resolved fallback file exists as an image in the web public folder", () => {
  for (const src of new Set([...Object.values(ANA_ALIASES), ...Object.values(RETAINED)])) {
    const bytes = readFileSync(publicDir + src);
    const webp = bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP";
    const png = bytes.subarray(1, 4).toString("latin1") === "PNG";
    assert.ok(src.endsWith(".webp") ? webp : png, src);
  }
});
