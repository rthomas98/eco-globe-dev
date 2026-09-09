// One-time, reviewed price correction. Defaults to a read-only plan.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const require = createRequire(new URL("packages/backend/package.json", root));
const { config } = require("dotenv");
const sql = require("mssql");
config({ path: fileURLToPath(new URL("packages/backend/.env.local", root)), quiet: true });
const source = JSON.parse(await readFile(new URL("docs/data/feedstock-prices-2026-09-09.json", root), "utf8"));
const apply = process.argv.includes("--apply");
const palletsConfirmed = process.argv.includes("--pallets-are-counts");
const expectedTitles = {
  7: "Black Gypsum", 15: "Hydrochar", 17: "Biochar", 4: "Epoxy Off-Spec",
  6: "Scrap Polymer Blend with Impurities", 22: "Premium Rice Hull Ash",
  21: "Guard Test Bagasse", 9: "Biomass Wood Pellets, Grade A",
  10: "Industrial By-Product: Rice Husk", 8: "Harvested and Baled Corn Stover",
  5: "Shredded, Refined Sugar Bagasse", 3: "Pyrolysis Pitch", 19: "Tar",
  13: "Refined Used Cooking Oil (UCO)", 11: "Certified Organic Wood Chips",
  16: "Used Pallets", 14: "Used Dry Transformer",
};
let pool;
let transaction;
try {
  if (source.prices.length !== 17 || new Set(source.prices.map(x => x.listingId)).size !== 17) throw new Error("Invalid source manifest");
  pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING ?? process.env.SQL_CONNECTION_STRING);
  const db = (await pool.request().query("SELECT DB_NAME() AS name")).recordset[0].name;
  if (db !== "sqldb-ecoglobe-dev") throw new Error("Unexpected database; refusing correction");
  transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  const before = (await new sql.Request(transaction).query("SELECT Id, Title, Slug, PricePerUnit, CurrencyCode, QuantityUnit, Quantity, MinimumOrderQuantity FROM dbo.Listings WITH (UPDLOCK, HOLDLOCK) ORDER BY Id")).recordset;
  const changes = [];
  for (const price of source.prices) {
    const row = before.find(x => x.Id === price.listingId);
    if (!row || row.Title !== expectedTitles[price.listingId]) throw new Error("Listing identity mismatch");
    if (!Number.isFinite(price.price) || price.price <= 0 || price.currency !== "USD") throw new Error("Invalid workbook price");
    if (row.Id === 16 && !palletsConfirmed) continue;
    const each = price.basis === "each";
    if (!each && !["ton", "tons", "tonne", "tonnes"].includes(row.QuantityUnit)) throw new Error("Mass unit mismatch");
    if (each && row.Id !== 16 && !["unit", "units"].includes(row.QuantityUnit)) throw new Error("Item unit mismatch");
    if (row.Id === 16 && (row.Quantity !== 500 || row.MinimumOrderQuantity !== 100)) throw new Error("Pallet quantities changed; review required");
    const after = { ...row, PricePerUnit: price.price, CurrencyCode: price.currency, QuantityUnit: row.Id === 16 ? "units" : row.QuantityUnit };
    if (row.PricePerUnit !== after.PricePerUnit || row.CurrencyCode !== after.CurrencyCode || row.QuantityUnit !== after.QuantityUnit) changes.push({ sourceRow: price.sourceRow, before: row, after });
  }
  const plan = { database: db, sourceSha256: source.sha256, applied: apply, createdAt: new Date().toISOString(), changes, excluded: palletsConfirmed ? [] : ["Used Pallets: quantity basis confirmation pending"], absentFromWorkbook: before.filter(x => x.PricePerUnit === 0 && !source.prices.some(p => p.listingId === x.Id)).map(x => ({ id: x.Id, title: x.Title })) };
  const receipt = new URL(`docs/data/feedstock-prices-${apply ? "applied" : "plan"}-${Date.now()}.json`, root);
  // Save the before-image before any mutation. No credentials are included.
  await writeFile(receipt, JSON.stringify({ ...plan, applied: false }, null, 2) + "\n", { flag: "wx" });
  if (apply) {
    for (const { after } of changes) {
      const request = new sql.Request(transaction);
      request.input("id", sql.Int, after.Id).input("price", sql.Decimal(18, 2), after.PricePerUnit).input("currency", sql.Char(3), after.CurrencyCode).input("unit", sql.VarChar(40), after.QuantityUnit);
      const result = await request.query("UPDATE dbo.Listings SET PricePerUnit=@price, CurrencyCode=@currency, QuantityUnit=@unit, UpdatedAt=SYSUTCDATETIME() WHERE Id=@id");
      if (result.rowsAffected[0] !== 1) throw new Error("Unexpected affected row count");
    }
    const actual = (await new sql.Request(transaction).query("SELECT Id, Title, Slug, PricePerUnit, CurrencyCode, QuantityUnit, Quantity, MinimumOrderQuantity FROM dbo.Listings ORDER BY Id")).recordset;
    const expected = before.map(row => changes.find(x => x.after.Id === row.Id)?.after ?? row);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Post-update verification failed");
    await transaction.commit(); transaction = null;
    await writeFile(receipt, JSON.stringify(plan, null, 2) + "\n");
  } else { await transaction.rollback(); transaction = null; }
  console.log(JSON.stringify({ applied: apply, changes: changes.length, receipt: fileURLToPath(receipt), excluded: plan.excluded, missing: plan.absentFromWorkbook }));
} catch (error) {
  if (transaction) await transaction.rollback().catch(() => {});
  console.error(error.code ? `SQL operation failed: ${error.code}` : error.message);
  process.exitCode = 1;
} finally { if (pool) await pool.close(); }
