import ExcelJS from "exceljs";
import { ApiError } from "./http.js";
import { MarketRecordError } from "./market-record-domain.js";
import { preflightXlsx, workbookWorker } from "./market-record-import.js";

export const listingImportHeaders = [
  "Title",
  "Material type",
  "Quantity",
  "Unit",
  "Minimum order",
  "Price per unit",
  "Currency",
  "Facility",
  "Description",
  "Carbon intensity (kg CO2e/t)",
  "Available from",
  "Available to",
];
export const listingImportUnits = [
  "ton",
  "tons",
  "tonne",
  "tonnes",
  "kg",
  "lb",
  "unit",
  "units",
];
export type ImportReferences = {
  sellerCompanyName: string;
  materials: Array<{ id: number; code: string; label: string }>;
  locations: Array<{ id: number; name: string }>;
  existingTitles: string[];
};
export type WorkbookCell = string | number | null | { date: string };
export type WorkbookRow = { rowNumber: number; cells: WorkbookCell[] };

export async function listingImportTemplate(
  refs: ImportReferences,
): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Listings");
  sheet.addRow(listingImportHeaders);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((column, i) => {
    column.width = i === 8 ? 50 : 24;
  });
  const instructions = book.addWorksheet("Instructions");
  for (const line of [
    "EcoGlobe bulk listing import — maximum 500 data rows. Do not rename Listings or its headers.",
    "Required columns: Title and Material type. Use a material label or code (case-insensitive).",
    "Units: ton, tons, tonne, tonnes, kg, lb, unit, units; t is accepted as tonnes.",
    "All rows import as drafts. Attach an SDS to each listing before submitting for review.",
    "Quantity, Unit, Minimum order, Price per unit, Currency and Facility are needed before review.",
    "Online checkout supports USD only; other currencies require a quote.",
    "Facility must match a seller facility name. Rename ambiguous facility names before importing.",
    "Dates: Excel dates or YYYY-MM-DD. Numbers: numeric cells or text; commas and a leading $ are accepted.",
    "Quantity and minimum order: up to 3 decimals; price: up to 2 decimals; values must be positive.",
    "Do not use formulas, macros, external links or embedded objects. Blank rows are skipped.",
  ])
    instructions.addRow([line]);
  instructions.getColumn(1).width = 130;
  const lists = book.addWorksheet("Lists");
  lists.addRow(["Material types", "Units", "Currencies", "Facilities"]);
  const values = [
    refs.materials.map((m) => m.label),
    listingImportUnits,
    ["USD", "CAD", "EUR", "GBP", "AUD", "JPY"],
    refs.locations.map((l) => l.name),
  ];
  const names = [
    "ListingImportMaterials",
    "ListingImportUnits",
    "ListingImportCurrencies",
    "ListingImportFacilities",
  ];
  values.forEach((items, i) => {
    items.forEach((value, row) => {
      lists.getCell(row + 2, i + 1).value = value;
    });
    lists.getColumn(i + 1).width = 35;
    const column = String.fromCharCode(65 + i);
    book.definedNames.add(
      `Lists!$${column}$2:$${column}$${Math.max(2, items.length + 1)}`,
      names[i]!,
    );
  });
  for (let row = 2; row <= 501; row++) {
    [2, 4, 7, 8].forEach((col, i) => {
      sheet.getCell(row, col).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [names[i]!],
        showErrorMessage: false,
      };
    });
    for (const column of [11, 12])
      sheet.getCell(row, column).numFmt = "yyyy-mm-dd";
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}

/** Executed in the bounded workbook worker, including ZIP/XML preflight. */
export async function parseListingWorkbookBytes(
  bytes: Buffer,
): Promise<WorkbookRow[]> {
  await preflightXlsx(bytes, "listing");
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(new Uint8Array(bytes).buffer);
  const sheet = book.getWorksheet("Listings");
  if (
    !sheet ||
    sheet.columnCount > 12 ||
    listingImportHeaders.some(
      (header, i) => sheet.getRow(1).getCell(i + 1).value !== header,
    )
  )
    throw new ApiError(
      400,
      `Workbook must contain a Listings sheet with these exact headers: ${listingImportHeaders.join(" | ")}.`,
    );
  const rows: WorkbookRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = listingImportHeaders.map((_, i): WorkbookCell => {
      const value = row.getCell(i + 1).value;
      if (value == null || value === "") return null;
      if (typeof value === "string") return value.trim() || null;
      if (typeof value === "number") return value;
      if (value instanceof Date)
        return {
          date: Number.isFinite(value.getTime())
            ? value.toISOString().slice(0, 10)
            : "invalid",
        };
      if (typeof value === "object" && "richText" in value)
        return (
          value.richText
            .map((p) => p.text)
            .join("")
            .trim() || null
        );
      throw new ApiError(
        400,
        "Unsupported cell content. Use plain text, numbers or dates.",
      );
    });
    if (cells.every((cell) => cell === null)) return;
    rows.push({ rowNumber, cells });
    if (rows.length > 500)
      throw new ApiError(
        400,
        "A workbook must contain between 1 and 500 data rows.",
      );
  });
  if (!rows.length)
    throw new ApiError(
      400,
      "A workbook must contain between 1 and 500 data rows.",
    );
  return rows;
}
export async function parseListingXlsx(bytes: Buffer): Promise<WorkbookRow[]> {
  try {
    return await workbookWorker<WorkbookRow[]>(
      bytes,
      import.meta.url,
      "parseListingWorkbookBytes",
    );
  } catch (error) {
    if (error instanceof MarketRecordError)
      throw new ApiError(
        /deadline/iu.test(error.message) ? 422 : error.status,
        error.message,
      );
    throw error;
  }
}
