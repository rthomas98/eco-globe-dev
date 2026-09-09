/**
 * Idempotent marketplace demo seed: verified seller companies with real
 * locations and ~18 published listings that mirror the frontend's demo
 * catalogue (same slugs, so API rows seamlessly replace the static ones).
 *
 * Run with: pnpm --filter=@eco-globe/backend db:seed
 */
import { config } from "dotenv";
import sql from "mssql";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

type SellerSeed = {
  legalName: string;
  locationName: string;
  addressLine1: string;
  city: string;
  stateProvince: string | null;
  countryCode: string;
  latitude: number;
  longitude: number;
};

type ListingSeed = {
  slug: string;
  title: string;
  seller: string;
  materialTypeCode: string;
  minimumOrderQuantity: number;
  quantityUnit: string;
  pricePerUnit: number;
  currencyCode: string;
  carbonIntensityKgCo2e: number | null;
  description: string;
};

const SELLERS: SellerSeed[] = [
  { legalName: "GulfStar Chemicals", locationName: "Houston terminal", addressLine1: "2400 Ship Channel Rd", city: "Houston", stateProvince: "TX", countryCode: "US", latitude: 29.7604, longitude: -95.3698 },
  { legalName: "Red Stick Biomass Co.", locationName: "Port Allen yard", addressLine1: "180 River Rd", city: "Port Allen", stateProvince: "LA", countryCode: "US", latitude: 30.4524, longitude: -91.2103 },
  { legalName: "Lowlands Feedstock BV", locationName: "Rotterdam depot", addressLine1: "Havenstraat 42", city: "Rotterdam", stateProvince: null, countryCode: "NL", latitude: 51.9244, longitude: 4.4777 },
  { legalName: "Occidente Verde SA", locationName: "Guadalajara planta", addressLine1: "Av. Industrial 88", city: "Guadalajara", stateProvince: "JAL", countryCode: "MX", latitude: 20.6597, longitude: -103.3496 },
  { legalName: "Paulista Residuos Ltda", locationName: "Sao Paulo patio", addressLine1: "Rua Verde 15", city: "Sao Paulo", stateProvince: "SP", countryCode: "BR", latitude: -23.5505, longitude: -46.6333 },
  { legalName: "Chubu Materials KK", locationName: "Nagoya works", addressLine1: "1-2-3 Minato", city: "Nagoya", stateProvince: null, countryCode: "JP", latitude: 35.1815, longitude: 136.9066 },
  { legalName: "Jubail Industrial Trading", locationName: "Jubail terminal", addressLine1: "Industrial City Rd 9", city: "Jubail", stateProvince: null, countryCode: "SA", latitude: 27.0046, longitude: 49.6583 },
];

const LISTINGS: ListingSeed[] = [
  { slug: "pyrolysis", title: "Pyrolysis Pitch", seller: "GulfStar Chemicals", materialTypeCode: "industrial_byproduct", minimumOrderQuantity: 1000, quantityUnit: "tons", pricePerUnit: 50, currencyCode: "USD", carbonIntensityKgCo2e: 300, description: "Refinery pyrolysis pitch stream, consistent viscosity, suitable for carbon products and fuel blending." },
  { slug: "epoxy-offspec", title: "Epoxy Off-Spec", seller: "GulfStar Chemicals", materialTypeCode: "industrial_byproduct", minimumOrderQuantity: 2, quantityUnit: "tons", pricePerUnit: 50, currencyCode: "USD", carbonIntensityKgCo2e: 280, description: "Off-spec liquid epoxy resin in 42-gallon barrels; certificates of analysis available per batch." },
  { slug: "bagasse", title: "Shredded, Refined Sugar Bagasse", seller: "Red Stick Biomass Co.", materialTypeCode: "certified_feedstock", minimumOrderQuantity: 200, quantityUnit: "tons", pricePerUnit: 48, currencyCode: "USD", carbonIntensityKgCo2e: 300, description: "Mill-run bagasse, shredded and refined for boiler fuel or pulp feedstock. Seasonal availability." },
  { slug: "polymer", title: "Scrap Polymer Blend with Impurities", seller: "GulfStar Chemicals", materialTypeCode: "industrial_byproduct", minimumOrderQuantity: 1000, quantityUnit: "tons", pricePerUnit: 60, currencyCode: "EUR", carbonIntensityKgCo2e: 300, description: "Mixed post-industrial polymer regrind with minor impurities; ideal for chemical recycling." },
  { slug: "black-gypsum", title: "Black Gypsum", seller: "GulfStar Chemicals", materialTypeCode: "industrial_byproduct", minimumOrderQuantity: 3, quantityUnit: "tons", pricePerUnit: 50, currencyCode: "USD", carbonIntensityKgCo2e: 240, description: "Black gypsum byproduct suitable for cement retarders and soil amendment applications." },
  { slug: "stover-walker", title: "Harvested and Baled Corn Stover", seller: "Lowlands Feedstock BV", materialTypeCode: "certified_feedstock", minimumOrderQuantity: 3, quantityUnit: "tons", pricePerUnit: 42, currencyCode: "USD", carbonIntensityKgCo2e: 300, description: "Field-baled corn stover, net-wrapped rounds, moisture below 18 percent." },
  { slug: "wood-pellets", title: "Biomass Wood Pellets, Grade A", seller: "Occidente Verde SA", materialTypeCode: "certified_feedstock", minimumOrderQuantity: 5, quantityUnit: "tons", pricePerUnit: 120, currencyCode: "USD", carbonIntensityKgCo2e: 210, description: "ENplus-grade wood pellets, low ash, bagged or bulk. Certification documents on request." },
  { slug: "rice-husk", title: "Industrial By-Product: Rice Husk", seller: "Paulista Residuos Ltda", materialTypeCode: "industrial_byproduct", minimumOrderQuantity: 10, quantityUnit: "tons", pricePerUnit: 28, currencyCode: "USD", carbonIntensityKgCo2e: 180, description: "Dry rice husk from milling operations; good silica source and biomass fuel." },
  { slug: "wood-chips", title: "Certified Organic Wood Chips", seller: "Red Stick Biomass Co.", materialTypeCode: "certified_feedstock", minimumOrderQuantity: 2, quantityUnit: "tons", pricePerUnit: 95, currencyCode: "USD", carbonIntensityKgCo2e: 150, description: "Certified organic hardwood chips, screened 10-50mm, kiln-ready." },
  { slug: "tire-crumb", title: "Recycled Tire Crumb Rubber", seller: "Chubu Materials KK", materialTypeCode: "used_product", minimumOrderQuantity: 6, quantityUnit: "tons", pricePerUnit: 180, currencyCode: "USD", carbonIntensityKgCo2e: 420, description: "Ambient-ground tire crumb, 30 mesh, steel-free. Suitable for surfaces and molded goods." },
  { slug: "used-cooking-oil", title: "Refined Used Cooking Oil (UCO)", seller: "Lowlands Feedstock BV", materialTypeCode: "certified_feedstock", minimumOrderQuantity: 4, quantityUnit: "tons", pricePerUnit: 550, currencyCode: "USD", carbonIntensityKgCo2e: 540, description: "ISCC-certified refined UCO, FFA below 5 percent, ready for biodiesel or HVO feed." },
  { slug: "used-dry-transformer", title: "Used Dry Transformer", seller: "GulfStar Chemicals", materialTypeCode: "used_product", minimumOrderQuantity: 50, quantityUnit: "units", pricePerUnit: 800, currencyCode: "USD", carbonIntensityKgCo2e: null, description: "Decommissioned dry-type transformers, tested cores, sold as reusable units or copper recovery stock." },
  { slug: "hydrochar", title: "Hydrochar", seller: "Lowlands Feedstock BV", materialTypeCode: "low_co2_feedstock", minimumOrderQuantity: 200, quantityUnit: "tons", pricePerUnit: 75, currencyCode: "EUR", carbonIntensityKgCo2e: 120, description: "HTC-processed hydrochar from green waste; stable carbon content, low chlorine." },
  { slug: "used-pallets", title: "Used Pallets", seller: "Red Stick Biomass Co.", materialTypeCode: "used_product", minimumOrderQuantity: 100, quantityUnit: "tons", pricePerUnit: 15, currencyCode: "USD", carbonIntensityKgCo2e: null, description: "Mixed-grade used wooden pallets for repair, reuse, or biomass chipping." },
  { slug: "biochar", title: "Biochar", seller: "Occidente Verde SA", materialTypeCode: "low_co2_feedstock", minimumOrderQuantity: 3, quantityUnit: "tons", pricePerUnit: 300, currencyCode: "USD", carbonIntensityKgCo2e: 85, description: "High-surface-area biochar from agave waste; soil amendment and filtration grades." },
  { slug: "white-label", title: "White Label", seller: "Jubail Industrial Trading", materialTypeCode: "industrial_byproduct", minimumOrderQuantity: 5, quantityUnit: "tons", pricePerUnit: 120, currencyCode: "USD", carbonIntensityKgCo2e: 210, description: "White-label industrial byproduct stream; specifications shared under NDA." },
  { slug: "tar", title: "Tar", seller: "GulfStar Chemicals", materialTypeCode: "industrial_byproduct", minimumOrderQuantity: 5, quantityUnit: "tons", pricePerUnit: 50, currencyCode: "USD", carbonIntensityKgCo2e: 360, description: "Coal tar byproduct suitable for sealants, coatings, and carbon feedstock." },
  { slug: "dark-viscous-liquids", title: "Dark Viscous Liquid Tonnels", seller: "Jubail Industrial Trading", materialTypeCode: "industrial_byproduct", minimumOrderQuantity: 10, quantityUnit: "tons", pricePerUnit: 620, currencyCode: "USD", carbonIntensityKgCo2e: 410, description: "Dark viscous refinery liquids in tonnel containers; analysis reports per lot." },
];

async function main() {
  const connectionString =
    process.env.AZURE_SQL_CONNECTION_STRING ?? process.env.SQL_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("Azure SQL connection string is not configured.");
  }
  const pool = await sql.connect(connectionString);

  const lookup = async (table: string, code: string) => {
    const result = await pool
      .request()
      .input("code", sql.VarChar(80), code)
      .query(`SELECT Id AS id FROM dbo.${table} WHERE Code = @code;`);
    const id = result.recordset[0]?.id as number | undefined;
    if (!id) throw new Error(`Unknown ${table} code: ${code}`);
    return id;
  };

  const sellerTypeId = await lookup("CompanyTypes", "seller");
  const verifiedStatusId = await lookup("AccountStatuses", "verified");
  const pickupTypeId = await lookup("LocationTypes", "pickup");
  const publishedStatusId = await lookup("ListingStatuses", "published");

  const companyIds = new Map<string, number>();
  const locationIds = new Map<string, number>();
  let companiesCreated = 0;
  let listingsCreated = 0;

  for (const seller of SELLERS) {
    const existing = await pool
      .request()
      .input("legalName", sql.NVarChar(240), seller.legalName)
      .query(
        "SELECT TOP (1) Id AS id FROM dbo.Companies WHERE LOWER(LegalName) = LOWER(@legalName) ORDER BY Id;",
      );
    let companyId = existing.recordset[0]?.id as number | undefined;
    if (!companyId) {
      const inserted = await pool
        .request()
        .input("legalName", sql.NVarChar(240), seller.legalName)
        .input("companyTypeId", sql.Int, sellerTypeId)
        .input("verificationStatusId", sql.Int, verifiedStatusId)
        .query(
          `INSERT INTO dbo.Companies (LegalName, CompanyTypeId, VerificationStatusId)
           OUTPUT INSERTED.Id AS id
           VALUES (@legalName, @companyTypeId, @verificationStatusId);`,
        );
      companyId = inserted.recordset[0].id as number;
      companiesCreated += 1;
    }
    companyIds.set(seller.legalName, companyId);

    const existingLocation = await pool
      .request()
      .input("companyId", sql.Int, companyId)
      .input("name", sql.NVarChar(160), seller.locationName)
      .query(
        "SELECT TOP (1) Id AS id FROM dbo.Locations WHERE CompanyId = @companyId AND Name = @name;",
      );
    let locationId = existingLocation.recordset[0]?.id as number | undefined;
    if (!locationId) {
      const insertedLocation = await pool
        .request()
        .input("companyId", sql.Int, companyId)
        .input("locationTypeId", sql.Int, pickupTypeId)
        .input("name", sql.NVarChar(160), seller.locationName)
        .input("addressLine1", sql.NVarChar(240), seller.addressLine1)
        .input("city", sql.NVarChar(120), seller.city)
        .input("stateProvince", sql.NVarChar(120), seller.stateProvince)
        .input("countryCode", sql.Char(2), seller.countryCode)
        .input("latitude", sql.Decimal(9, 6), seller.latitude)
        .input("longitude", sql.Decimal(9, 6), seller.longitude)
        .query(
          `INSERT INTO dbo.Locations (
             CompanyId, LocationTypeId, Name, AddressLine1, City, StateProvince,
             CountryCode, Latitude, Longitude, IsDefault
           )
           OUTPUT INSERTED.Id AS id
           VALUES (
             @companyId, @locationTypeId, @name, @addressLine1, @city, @stateProvince,
             @countryCode, @latitude, @longitude,
             CASE WHEN EXISTS (SELECT 1 FROM dbo.Locations WHERE CompanyId = @companyId AND IsDefault = 1) THEN 0 ELSE 1 END
           );`,
        );
      locationId = insertedLocation.recordset[0].id as number;
    }
    locationIds.set(seller.legalName, locationId);
  }

  for (const listing of LISTINGS) {
    const companyId = companyIds.get(listing.seller);
    const locationId = locationIds.get(listing.seller);
    if (!companyId || !locationId) continue;

    const existing = await pool
      .request()
      .input("slug", sql.VarChar(180), listing.slug)
      .query("SELECT Id AS id FROM dbo.Listings WHERE Slug = @slug;");
    if (existing.recordset[0]) continue;

    const materialTypeId = await lookup("MaterialTypes", listing.materialTypeCode);
    const quantity = Math.max(
      listing.minimumOrderQuantity * 5,
      listing.minimumOrderQuantity + 100,
    );

    await pool
      .request()
      .input("sellerCompanyId", sql.Int, companyId)
      .input("locationId", sql.Int, locationId)
      .input("title", sql.NVarChar(200), listing.title)
      .input("slug", sql.VarChar(180), listing.slug)
      .input("materialTypeId", sql.Int, materialTypeId)
      .input("quantity", sql.Decimal(18, 3), quantity)
      .input("quantityUnit", sql.VarChar(40), listing.quantityUnit)
      .input("minimumOrderQuantity", sql.Decimal(18, 3), listing.minimumOrderQuantity)
      .input("pricePerUnit", sql.Decimal(18, 2), listing.pricePerUnit)
      .input("currencyCode", sql.Char(3), listing.currencyCode)
      .input("listingStatusId", sql.Int, publishedStatusId)
      .input("carbonIntensity", sql.Decimal(18, 3), listing.carbonIntensityKgCo2e)
      .input("description", sql.NVarChar(sql.MAX), listing.description)
      .query(
        `INSERT INTO dbo.Listings (
           SellerCompanyId, LocationId, Title, Slug, MaterialTypeId, Quantity,
           QuantityUnit, MinimumOrderQuantity, PricePerUnit, CurrencyCode,
           ListingStatusId, CarbonIntensityKgCo2e, Description
         )
         VALUES (
           @sellerCompanyId, @locationId, @title, @slug, @materialTypeId, @quantity,
           @quantityUnit, @minimumOrderQuantity, @pricePerUnit, @currencyCode,
           @listingStatusId, @carbonIntensity, @description
         );`,
      );
    listingsCreated += 1;
  }

  const totals = await pool.request().query(
    `SELECT
       (SELECT COUNT(*) FROM dbo.Companies) AS companies,
       (SELECT COUNT(*) FROM dbo.Listings l INNER JOIN dbo.ListingStatuses ls ON ls.Id = l.ListingStatusId WHERE ls.Code = 'published') AS publishedListings;`,
  );

  console.log(
    JSON.stringify({
      companiesCreated,
      listingsCreated,
      ...totals.recordset[0],
    }),
  );

  await pool.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
