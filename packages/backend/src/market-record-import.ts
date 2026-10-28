import ExcelJS from "exceljs";
import yauzl from "yauzl";
import { SaxesParser } from "saxes";
import { createHash } from "node:crypto";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type {
  MarketPreviewRow,
  MarketDiagnostic,
} from "../../shared/src/market-records-api.js";
import {
  MarketRecordError,
  recordInput,
  invalid,
} from "./market-record-domain.js";

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const importLimits = {
  compressed: 2 * 1024 * 1024,
  expanded: 25 * 1024 * 1024,
  entry: 5 * 1024 * 1024,
  entries: 100,
  rows: 2000,
  cells: 40000,
  text: 4000,
  deadlineMs: 10000,
};
export const workbookHeaders = [
  "Company",
  "Facility",
  "Street address",
  "City",
  "State / province",
  "Postal code",
  "Country",
  "Feedstock",
  "Feedstock group",
  "Mid volume",
  "Volume unit",
  "Mid selling price",
  "Currency",
  "Price per",
  "Checked by EcoGlobe",
  "Record type",
  "Citation",
  "Address source",
];
const footerHash =
  "577abd2c1182f365a1dd2763b42b33a4aa23be70356e7d5ecf6984be32bfde24";
const sourceMap: Record<string, string> = {
  "Confirmed stream": "confirmed_stream",
  "Identified stream": "identified_stream",
  Estimate: "estimate",
  Prospect: "prospect",
  "Buyer need": "buyer_need",
};
const countries: Record<string, string> = {
  "United States": "US",
  USA: "US",
  US: "US",
  Canada: "CA",
  CA: "CA",
  "United Kingdom": "GB",
  UK: "GB",
  GB: "GB",
  Germany: "DE",
  DE: "DE",
  Netherlands: "NL",
  NL: "NL",
  France: "FR",
  FR: "FR",
  Mexico: "MX",
  MX: "MX",
  Belgium: "BE",
  BE: "BE",
  Sweden: "SE",
  SE: "SE",
  Brazil: "BR",
  BR: "BR",
  Poland: "PL",
  PL: "PL",
  Italy: "IT",
  IT: "IT",
  Finland: "FI",
  FI: "FI",
  Spain: "ES",
  ES: "ES",
  Slovakia: "SK",
  SK: "SK",
  Czechia: "CZ",
  CZ: "CZ",
};
function unsafe(message: string): never {
  throw new MarketRecordError(400, "unsupported_format", message);
}
function bound(condition: boolean, message: string) {
  if (condition) throw new MarketRecordError(413, "file_too_large", message);
}
// IEEE CRC-32; validates decompressed bytes against the ZIP directory checksum.
function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function passiveCitationUrl(value: string): string {
  if (value.length > 2000) unsafe("Citation URL exceeds the supported length.");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    unsafe("Invalid citation URL.");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  )
    unsafe(
      "Only passive HTTP(S) citation URLs without user information are supported.",
    );
  return value;
}
type XmlInspection = {
  links: Map<string, string>;
  references: Map<string, string>;
};
function inspectXml(
  name: string,
  bytes: Buffer,
  profile: "market" | "listing",
): XmlInspection {
  const source = bytes.toString("utf8");
  if (source.includes("\ufffd") || /<!DOCTYPE|<!ENTITY/iu.test(source))
    unsafe("DTD, entities and invalid UTF-8 are unsupported.");
  const parser = new SaxesParser({ xmlns: true });
  let rows = 0,
    cells = 0,
    textLength = 0;
  const rowRefs = new Set<number>(),
    cellRefs = new Set<string>();
  let inText = 0;
  let sheetNames = 0;
  let filterRange: string | null = null;
  let definedName = "";
  let validationFormula: string | null = null;
  const result: XmlInspection = { links: new Map(), references: new Map() };
  parser.on("doctype", () => unsafe("Document types are unsupported."));
  parser.on("opentag", (tag) => {
    const attrs = Object.fromEntries(
      Object.values(tag.attributes).map((a) => [a.local, a.value]),
    );
    if (tag.local === "f" || tag.local === "formula")
      unsafe("Formulas are unsupported.");
    if (profile === "listing" && tag.local === "formula1")
      validationFormula = "";
    if (profile === "listing" && tag.local === "formula2")
      unsafe("Calculation formulas are unsupported.");
    if (tag.local === "definedName") {
      definedName = attrs.name ?? "";
      if (
        (profile === "listing"
          ? ![
              "ListingImportMaterials",
              "ListingImportUnits",
              "ListingImportCurrencies",
              "ListingImportFacilities",
              "_xlnm._FilterDatabase",
              "_xlnm.Print_Titles",
              "_xlnm.Print_Area",
            ].includes(attrs.name ?? "")
          : attrs.name !== "_xlnm._FilterDatabase") ||
        (profile === "market" &&
          !["0", "1"].includes(attrs.localSheetId ?? "")) ||
        (attrs.function && !["false", "0"].includes(attrs.function)) ||
        (attrs.vbProcedure && !["false", "0"].includes(attrs.vbProcedure))
      )
        unsafe("Calculation names are unsupported.");
      filterRange = "";
    }
    if (tag.local === "Relationship") {
      const hyperlink =
        attrs.Type ===
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
      if (hyperlink) {
        if (profile === "listing")
          unsafe("Hyperlinks are unsupported in listing imports.");
        if (
          attrs.TargetMode !== "External" ||
          !attrs.Id ||
          result.links.has(attrs.Id) ||
          !/^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/u.test(name)
        )
          unsafe("Unsupported hyperlink relationship.");
        result.links.set(attrs.Id, passiveCitationUrl(attrs.Target ?? ""));
      } else if (
        attrs.TargetMode?.toLowerCase() === "external" ||
        /(?:externalLink|oleObject|vbaProject)/iu.test(attrs.Type ?? "")
      )
        unsafe("External references and embedded content are unsupported.");
    }
    if (tag.local === "hyperlink") {
      if (
        !/^[QR][1-9]\d{0,3}$/u.test(attrs.ref ?? "") ||
        !attrs.id ||
        attrs.location ||
        result.references.has(attrs.id)
      )
        unsafe("Only citation/address-source cell hyperlinks are supported.");
      result.references.set(attrs.id, attrs.ref!);
    }
    if (tag.local === "sheet")
      bound(
        ++sheetNames > (profile === "listing" ? 3 : 2),
        profile === "listing"
          ? "Only Listings, Instructions and Lists sheets are supported."
          : "Only Sellers and Buyers sheets are supported.",
      );
    if (tag.local === "row") {
      const ref = Number(attrs.r);
      if (
        !Number.isInteger(ref) ||
        ref < 1 ||
        ref > importLimits.rows + 10 ||
        rowRefs.has(ref)
      )
        unsafe("Invalid, repeated or sparse worksheet row.");
      rowRefs.add(ref);
      bound(++rows > importLimits.rows + 4, "Too many worksheet rows.");
    }
    if (tag.local === "c") {
      const ref = attrs.r ?? "";
      if (
        !/^[A-R][1-9]\d{0,3}$/u.test(ref) ||
        Number(ref.slice(1)) > importLimits.rows + 10 ||
        cellRefs.has(ref)
      )
        unsafe("Invalid, repeated or sparse worksheet cell.");
      cellRefs.add(ref);
      bound(++cells > importLimits.cells, "Too many worksheet cells.");
      if (attrs.t && !["n", "s", "inlineStr", "str"].includes(attrs.t))
        unsafe("Unsupported worksheet cell type.");
    }
    if (tag.local === "t" || tag.local === "v") {
      inText++;
      textLength = 0;
    }
    if (
      tag.local === "dimension" &&
      attrs.ref &&
      !/^(?:[A-R][1-9]\d{0,3})(?::[A-R][1-9]\d{0,3})?$/u.test(attrs.ref)
    )
      unsafe("Unsafe worksheet dimension.");
  });
  parser.on("text", (value) => {
    if (validationFormula !== null) {
      validationFormula += value;
      if (validationFormula.length > 80)
        unsafe("Unsupported validation formula.");
    }
    if (filterRange !== null) {
      filterRange += value;
      bound(filterRange.length > 80, "Filter range is too long.");
    }
    if (inText) {
      textLength += value.length;
      bound(
        textLength > (profile === "listing" ? 20000 : importLimits.text),
        "Cell text is too long.",
      );
    }
  });
  parser.on("closetag", (tag) => {
    if (profile === "listing" && tag.local === "formula1") {
      if (
        ![
          "ListingImportMaterials",
          "ListingImportUnits",
          "ListingImportCurrencies",
          "ListingImportFacilities",
        ].includes(validationFormula ?? "") &&
        !boundedListingRange(validationFormula ?? "", true)
      )
        unsafe("Only template dropdown references are supported.");
      validationFormula = null;
    }
    if (tag.local === "t" || tag.local === "v") inText--;
    if (tag.local === "definedName") {
      if (profile === "listing") {
        if (
          !boundedListingRange(
            filterRange ?? "",
            !definedName.startsWith("_xlnm."),
            definedName === "_xlnm.Print_Titles",
          )
        )
          unsafe("Only bounded listing template ranges are supported.");
      } else if (
        !/^(?:Sellers|Buyers)!\$A\$1:\$R\$[1-9]\d{0,3}$/u.test(
          filterRange ?? "",
        ) ||
        Number(filterRange?.split("$").pop()) > importLimits.rows + 10
      )
        unsafe("Only bounded template filter ranges are supported.");
      filterRange = null;
    }
  });
  parser.write(source).close();
  return result;
}
function boundedListingRange(
  value: string,
  listsOnly: boolean,
  printTitles = false,
): boolean {
  if (printTitles) {
    if (value.includes(","))
      return value
        .split(",")
        .every((part) => boundedListingRange(part, false, true));
    // Print metadata may repeat bounded rows/columns; it never supplies cell data.
    const rows =
      /^(?:Lists|'Lists'|Listings|'Listings')!\$?([1-9]\d{0,3}):\$?([1-9]\d{0,3})$/u.exec(
        value,
      );
    if (rows)
      return Number(rows[1]) <= Number(rows[2]) && Number(rows[2]) <= 501;
    const columns =
      /^(?:Lists|'Lists'|Listings|'Listings')!\$?([A-L]):\$?([A-L])$/u.exec(
        value,
      );
    if (columns) return columns[1]! <= columns[2]!;
  }
  const match =
    /^(Lists|'Lists'|Listings|'Listings')!\$?([A-L])\$?([1-9]\d{0,3})(?::\$?([A-L])\$?([1-9]\d{0,3}))?$/u.exec(
      value,
    );
  if (!match) return false;
  const sheet = match[1]!.replaceAll("'", "");
  const firstRow = Number(match[3]),
    lastRow = Number(match[5] ?? match[3]);
  const firstCol = match[2]!,
    lastCol = match[4] ?? firstCol;
  return (
    (!listsOnly || (sheet === "Lists" && firstCol <= "D" && lastCol <= "D")) &&
    firstRow <= lastRow &&
    firstCol <= lastCol &&
    lastRow <= (sheet === "Lists" ? importLimits.rows + 10 : 501)
  );
}
export async function preflightXlsx(
  bytes: Buffer,
  profile: "market" | "listing" = "market",
): Promise<void> {
  bound(
    bytes.length > importLimits.compressed,
    "Workbook exceeds 2 MiB. Split the workbook and retry.",
  );
  if (bytes.length < 4 || bytes.readUInt32LE(0) !== 0x04034b50)
    unsafe("Upload must be an XLSX ZIP workbook.");
  const zip = await new Promise<yauzl.ZipFile>((resolve, reject) =>
    yauzl.fromBuffer(
      bytes,
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (error, file) =>
        error
          ? reject(error)
          : file
            ? resolve(file)
            : reject(new Error("Missing archive")),
    ),
  );
  let count = 0,
    total = 0;
  const names = new Set<string>(),
    parts = new Map<string, XmlInspection>();
  try {
    await new Promise<void>((resolve, reject) => {
      zip.on("error", reject);
      zip.on("end", resolve);
      zip.on("entry", (entry: yauzl.Entry) => {
        void (async () => {
          const name = entry.fileName;
          bound(++count > importLimits.entries, "Too many ZIP entries.");
          if (
            names.has(name) ||
            name.includes("\\") ||
            name.split("/").some((p) => p === ".." || p === ".") ||
            name.startsWith("/") ||
            entry.generalPurposeBitFlag & 1 ||
            ![0, 8].includes(entry.compressionMethod)
          )
            unsafe("Unsafe ZIP entry.");
          const local = entry.relativeOffsetOfLocalHeader;
          if (
            local < 0 ||
            local + 30 > bytes.length ||
            bytes.readUInt32LE(local) !== 0x04034b50
          )
            unsafe("Invalid ZIP local header.");
          const nameLength = bytes.readUInt16LE(local + 26),
            extraLength = bytes.readUInt16LE(local + 28);
          if (
            local + 30 + nameLength + extraLength > bytes.length ||
            !/^[\x20-\x7e]+$/u.test(name) ||
            bytes
              .subarray(local + 30, local + 30 + nameLength)
              .toString("ascii") !== name ||
            bytes.readUInt16LE(local + 6) !== entry.generalPurposeBitFlag ||
            bytes.readUInt16LE(local + 8) !== entry.compressionMethod
          )
            unsafe("Conflicting ZIP local and central metadata.");
          names.add(name);
          if (
            /(?:vba|macro|externalLinks|embeddings|activeX|oleObject|calcChain)/iu.test(
              name,
            )
          )
            unsafe(
              "Macros, external references and embedded content are unsupported.",
            );
          if (name.endsWith("/")) {
            zip.readEntry();
            return;
          }
          if (!name.endsWith(".xml") && !name.endsWith(".rels"))
            unsafe("Only XML XLSX content is supported.");
          bound(
            entry.uncompressedSize > importLimits.entry,
            "ZIP entry is too large.",
          );
          const stream = await new Promise<NodeJS.ReadableStream>((res, rej) =>
            zip.openReadStream(entry, (e, s) =>
              e ? rej(e) : s ? res(s) : rej(new Error("Missing stream")),
            ),
          );
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const raw of stream) {
            const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
            size += chunk.length;
            total += chunk.length;
            bound(
              size > importLimits.entry || total > importLimits.expanded,
              "Expanded workbook exceeds import limits.",
            );
            chunks.push(chunk);
          }
          const content = Buffer.concat(chunks);
          if (size !== entry.uncompressedSize || crc32(content) !== entry.crc32)
            unsafe("Corrupt ZIP entry checksum or size.");
          if (
            /macroEnabled|vbaProject|application\/vnd\.ms-excel/iu.test(
              content.toString("utf8"),
            )
          )
            unsafe("Macro-enabled workbooks are unsupported.");
          parts.set(name, inspectXml(name, content, profile));
          zip.readEntry();
        })().catch(reject);
      });
      zip.readEntry();
    });
    if (!names.has("xl/workbook.xml") || !names.has("[Content_Types].xml"))
      unsafe("Missing XLSX workbook metadata.");
    for (const [name, part] of parts)
      if (/^xl\/worksheets\/sheet\d+\.xml$/u.test(name)) {
        const rel = parts.get(
          name.replace("xl/worksheets/", "xl/worksheets/_rels/") + ".rels",
        );
        for (const id of part.references.keys())
          if (!rel?.links.has(id))
            unsafe("Citation hyperlink references a missing relationship.");
        for (const id of rel?.links.keys() ?? [])
          if (!part.references.has(id))
            unsafe("Unreferenced external hyperlink metadata is unsupported.");
      }
  } finally {
    zip.close();
  }
}
function diagnostic(
  code: string,
  message: string,
  field: string | null = null,
  severity: MarketDiagnostic["severity"] = "warning",
): MarketDiagnostic {
  return { severity, code, field, message };
}
function cellText(cell: ExcelJS.Cell): string | null {
  const value = cell.value;
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" || typeof value === "number")
    return String(value).trim() || null;
  if (typeof value === "object" && "hyperlink" in value) {
    if (!/^[QR]\d+$/u.test(cell.address))
      unsafe("Only citation/address-source hyperlinks are supported.");
    const url = passiveCitationUrl(value.hyperlink);
    const label = String(value.text ?? "").trim();
    return !label || label === url ? url : `${label} (${url})`;
  }
  if (typeof value === "object" && "richText" in value)
    return (
      value.richText
        .map((part) => part.text)
        .join("")
        .trim() || null
    );
  unsafe("Unsupported cell content; only text and numbers are accepted.");
}
export async function parseWorkbookBytes(
  bytes: Buffer,
): Promise<MarketPreviewRow[]> {
  await preflightXlsx(bytes);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(new Uint8Array(bytes).buffer);
  if (
    book.worksheets.length !== 2 ||
    !book.getWorksheet("Sellers") ||
    !book.getWorksheet("Buyers")
  )
    unsafe("Workbook must contain exactly Sellers and Buyers sheets.");
  const result: MarketPreviewRow[] = [];
  let cells = 0,
    dataRows = 0;
  for (const sheet of book.worksheets) {
    if (sheet.state !== "visible") unsafe("Hidden worksheets are unsupported.");
    if (sheet.columnCount > 18 || sheet.rowCount > importLimits.rows + 10)
      unsafe("Worksheet dimensions exceed the template.");
    const header = sheet.getRow(1);
    if (
      workbookHeaders.some(
        (label, i) =>
          cellText(header.getCell(i + 1))?.replace(/^\ufeff/u, "") !== label,
      )
    )
      unsafe("Worksheet headers do not match the 18-column template.");
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = Array.from({ length: 18 }, (_, i) =>
        cellText(row.getCell(i + 1)),
      );
      cells += row.actualCellCount;
      bound(cells > importLimits.cells, "Too many workbook cells.");
      if (values.every((v) => v === null)) return;
      const entry: MarketPreviewRow = {
        rowKey: `${sheet.name}!${rowNumber}`,
        sheet: sheet.name,
        rowNumber,
        proposedRecord: null,
        decision: "create",
        diagnostics: [],
        duplicateOfId: null,
      };
      result.push(entry);
      if (
        values[0] !== null &&
        createHash("sha256").update(values[0]!).digest("hex") === footerHash &&
        values.slice(1).every((v) => v === null)
      ) {
        entry.decision = "skip";
        entry.diagnostics.push(
          diagnostic(
            "ignored_footer",
            "Recognized template footer ignored.",
            null,
            "info",
          ),
        );
        return;
      }
      bound(++dataRows > importLimits.rows, "Too many data rows.");
      try {
        const [
          company,
          facility,
          street,
          city,
          state,
          postal,
          country,
          feedstock,
          group,
          volume,
          volumeUnit,
          price,
          currency,
          pricePer,
          checked,
          type,
          citation,
          addressSource,
        ] = values;
        const countryCode = country ? countries[country] : null;
        if (country && !countryCode)
          invalid(
            "address.countryCode",
            "Unrecognized country; use a supported country name or code.",
          );
        if (country && country !== countryCode)
          entry.diagnostics.push(
            diagnostic(
              "country_normalized",
              `Country normalized to ${countryCode}.`,
              "address.countryCode",
            ),
          );
        if (checked !== "Yes" && checked !== "No" && checked !== null)
          invalid("sourceChecked", "Checked must be Yes, No or blank.");
        if (!type || !sourceMap[type])
          invalid("sourceRecordType", "Unrecognized source record type.");
        if (volumeUnit && !["t/yr", "gal/yr"].includes(volumeUnit))
          invalid("volume.unit", "Volume unit must be t/yr or gal/yr.");
        if (currency && !["USD", "EUR"].includes(currency))
          invalid(
            "price.currencyCode",
            "Imported currency must be USD or EUR.",
          );
        if (pricePer && !["t", "gal"].includes(pricePer))
          invalid("price.perUnit", "Imported price per-unit must be t or gal.");
        let postalText = postal;
        const postalCell = row.getCell(6);
        if (typeof postalCell.value === "number") {
          if (
            /^0{1,12}$/u.test(postalCell.numFmt) &&
            Number.isInteger(postalCell.value)
          )
            postalText = String(postalCell.value).padStart(
              postalCell.numFmt.length,
              "0",
            );
          else
            entry.diagnostics.push(
              diagnostic(
                "postal_numeric",
                "Postal code is numeric; leading zeros are unknown and were not invented.",
                "address.postalCode",
              ),
            );
        }
        const data = recordInput({
          role: sheet.name === "Sellers" ? "seller" : "buyer",
          companyName: company,
          facilityName: facility,
          feedstock,
          feedstockGroup: group,
          buyerNeed: sheet.name === "Buyers" ? feedstock : null,
          sourceRecordType: type ? sourceMap[type] : undefined,
          sourceChecked: checked === null ? null : checked === "Yes",
          sourceCitation: citation,
          addressSource,
          sourceCheckedBy: null,
          sourceCheckedAt: null,
          address: {
            street,
            city,
            stateProvince: state,
            postalCode: postalText,
            countryCode,
            purpose: "unknown",
          },
          price: {
            value: price,
            currencyCode: currency,
            perUnit: pricePer,
            citation,
          },
          volume: {
            value: volume,
            unit: volumeUnit?.split("/")[0] ?? null,
            period: volumeUnit ? "annual" : "unspecified",
            citation,
          },
        });
        if (data.price.value !== null) data.price.status = "estimated";
        if (data.volume.value !== null) data.volume.status = "estimated";
        if (price?.startsWith("-"))
          entry.diagnostics.push(
            diagnostic(
              "research_gate_fee",
              "Signed gate fee is research only, never a marketplace offer.",
              "price.value",
            ),
          );
        if (volume !== null)
          entry.diagnostics.push(
            diagnostic(
              "annual_not_stock",
              "Annual flow or capacity is not available stock.",
              "volume.value",
            ),
          );
        if (checked === "Yes")
          entry.diagnostics.push(
            diagnostic(
              "source_assertion_only",
              "Checked is an imported source assertion; original reviewer/date and KYC are unknown.",
              "sourceChecked",
            ),
          );
        entry.diagnostics.push(
          diagnostic(
            "address_not_operational",
            "Sourced address is not confirmed for operational pickup.",
            "address",
          ),
        );
        if (/\b(?:HQ|headquarters|office)\b/iu.test(facility ?? ""))
          entry.diagnostics.push(
            diagnostic(
              "headquarters_or_office",
              "Facility name may describe headquarters or an office; purpose remains unknown.",
              "address.purpose",
            ),
          );
        entry.proposedRecord = data;
      } catch (error) {
        if (!(error instanceof MarketRecordError)) throw error;
        entry.decision = "error";
        entry.diagnostics.push(
          diagnostic(
            error.code,
            error.message,
            Object.keys(error.fieldErrors)[0] ?? null,
            "error",
          ),
        );
      }
    });
  }
  return result;
}
let activeWorkbookWorkers = 0;
let activeListingWorkers = 0;
/** At most 3 parses at once; seller listing imports may hold only 2, so an admin market import always has a slot. */
const workbookWorkerLimits = { total: 3, listing: 2 };
export type WorkbookPool = "market" | "listing";
/** Parse off the API event loop; terminate even synchronous parser work at the deadline. */
export async function workbookWorker<T>(
  bytes: Buffer,
  moduleUrl: string,
  exportName: string,
  pool: WorkbookPool = "market",
): Promise<T> {
  bound(
    bytes.length > importLimits.compressed,
    "Workbook exceeds 2 MiB. Split the workbook and retry.",
  );
  if (
    activeWorkbookWorkers >= workbookWorkerLimits.total ||
    (pool === "listing" && activeListingWorkers >= workbookWorkerLimits.listing)
  )
    throw new MarketRecordError(
      503,
      "parser_busy",
      "Workbook parser is busy, retry shortly.",
    );
  activeWorkbookWorkers++;
  if (pool === "listing") activeListingWorkers++;
  let runningWorker: Worker | undefined;
  try {
    const loader = moduleUrl.endsWith(".ts")
      ? pathToFileURL(createRequire(import.meta.url).resolve("tsx/esm/api"))
          .href
      : null;
    const rows = await new Promise<T>((resolve, reject) => {
      const worker = new Worker(
        `const {parentPort,workerData}=require('node:worker_threads');
      (async()=>{try {const m=workerData.loader ? await (await import(workerData.loader)).tsImport(workerData.moduleUrl,workerData.moduleUrl) : await import(workerData.moduleUrl);parentPort.postMessage({rows:await m[workerData.exportName](Buffer.from(workerData.bytes))});}catch(e){parentPort.postMessage({error:{message:e.message,status:e.status||400,code:e.code||'unsupported_format'}});}})();`,
        {
          eval: true,
          workerData: { bytes, moduleUrl, loader, exportName },
          resourceLimits: {
            maxOldGenerationSizeMb: 128,
            maxYoungGenerationSizeMb: 32,
          },
        },
      );
      runningWorker = worker;
      const timer = setTimeout(() => {
        void worker.terminate();
        reject(
          new MarketRecordError(
            413,
            "file_too_large",
            "Workbook parsing exceeded its deadline.",
          ),
        );
      }, importLimits.deadlineMs);
      worker.once(
        "message",
        (message: {
          rows?: T;
          error?: { message: string; status: number; code: string };
        }) => {
          clearTimeout(timer);
          void worker.terminate();
          if (message.error)
            reject(
              new MarketRecordError(
                message.error.status,
                message.error.code,
                message.error.message,
              ),
            );
          else if (message.rows) resolve(message.rows);
          else
            reject(
              new MarketRecordError(
                400,
                "unsupported_format",
                "Workbook could not be parsed.",
              ),
            );
        },
      );
      worker.once("error", (error) => {
        clearTimeout(timer);
        reject(
          new MarketRecordError(
            400,
            "unsupported_format",
            `Workbook parser failed: ${error.name}.`,
          ),
        );
      });
      worker.once("exit", () => {
        clearTimeout(timer);
        reject(
          new MarketRecordError(
            400,
            "unsupported_format",
            "Workbook parser stopped before completing.",
          ),
        );
      });
    });
    return rows;
  } finally {
    try {
      if (runningWorker) await runningWorker.terminate();
    } finally {
      activeWorkbookWorkers--;
      if (pool === "listing") activeListingWorkers--;
    }
  }
}
export async function parseXlsx(
  bytes: Buffer,
): Promise<{ rows: MarketPreviewRow[]; fileSha256: string }> {
  const rows = await workbookWorker<MarketPreviewRow[]>(
    bytes,
    import.meta.url,
    "parseWorkbookBytes",
  );
  return { rows, fileSha256: createHash("sha256").update(bytes).digest("hex") };
}
