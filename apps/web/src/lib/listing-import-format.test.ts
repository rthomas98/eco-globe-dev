import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canCommitImport,
  detailsDraftFrom,
  parseDetailsDraft,
  filterImportRows,
  importSummary,
  importedListingNext,
  importedNextLabel,
  importedProgress,
  isListingImportWrite,
  matchSdsFiles,
  sdsMatchKey,
  missingSubmissionFields,
  workbookFileProblem,
  type ImportedListingState,
} from "./listing-import-format.ts";

const complete: ImportedListingState = {
  listingStatusCode: "draft",
  hasSds: true,
  quantity: 100,
  quantityUnit: "tonnes",
  minimumOrderQuantity: 5,
  pricePerUnit: 120,
  currencyCode: "USD",
  locationId: 7,
};

test("an import can only be committed with rows and no errors", () => {
  assert.equal(canCommitImport({ total: 3, ready: 2, warning: 1, error: 0 }), true);
  assert.equal(canCommitImport({ total: 3, ready: 2, warning: 0, error: 1 }), false);
  assert.equal(canCommitImport({ total: 0, ready: 0, warning: 0, error: 0 }), false);
});

test("row filters keep spreadsheet order", () => {
  const rows = [
    { rowNumber: 2, status: "ready" as const },
    { rowNumber: 3, status: "error" as const },
    { rowNumber: 4, status: "warning" as const },
    { rowNumber: 5, status: "error" as const },
  ];
  assert.deepEqual(filterImportRows(rows, "all").map((r) => r.rowNumber), [2, 3, 4, 5]);
  assert.deepEqual(filterImportRows(rows, "error").map((r) => r.rowNumber), [3, 5]);
  assert.deepEqual(filterImportRows(rows, "warning").map((r) => r.rowNumber), [4]);
});

test("the summary says nothing was imported while errors remain", () => {
  assert.match(importSummary({ total: 4, ready: 2, warning: 1, error: 1 }), /^1 row has errors\. Fix it .*nothing has been imported\.$/);
  assert.match(importSummary({ total: 4, ready: 1, warning: 1, error: 2 }), /^2 rows have errors\. Fix them/);
  assert.equal(importSummary({ total: 3, ready: 2, warning: 1, error: 0 }), "3 listings ready to import as drafts, 1 row with warnings.");
  assert.equal(importSummary({ total: 1, ready: 1, warning: 0, error: 0 }), "1 listing ready to import as drafts.");
  assert.equal(importSummary({ total: 0, ready: 0, warning: 0, error: 0 }), "The spreadsheet has no listing rows.");
});

test("missing submission fields mirror the backend submit rule", () => {
  assert.deepEqual(missingSubmissionFields(complete), []);
  assert.deepEqual(
    missingSubmissionFields({ ...complete, quantity: null, quantityUnit: null, minimumOrderQuantity: 0, pricePerUnit: null, currencyCode: null, locationId: null }),
    ["quantity", "unit", "minimum order", "price", "currency", "facility"],
  );
  // A zero price is a recorded price; checkout's own minimum is handled elsewhere.
  assert.deepEqual(missingSubmissionFields({ ...complete, pricePerUnit: 0 }), []);
});

test("next step: details first, then SDS, then submit", () => {
  assert.equal(importedListingNext({ ...complete, quantity: null, hasSds: false }), "complete-details");
  assert.equal(importedListingNext({ ...complete, hasSds: false }), "add-sds");
  assert.equal(importedListingNext(complete), "submit");
  assert.equal(importedListingNext({ ...complete, listingStatusCode: "pending_review" }), "submitted");
  assert.equal(importedListingNext({ ...complete, listingStatusCode: "published" }), "published");
  assert.equal(importedListingNext({ ...complete, listingStatusCode: "closed" }), "other");
  assert.equal(importedNextLabel("complete-details", ["price", "facility"]), "Add price, facility");
  assert.equal(importedNextLabel("add-sds"), "Upload an SDS PDF");
});

test("progress tallies each imported listing once", () => {
  assert.deepEqual(
    importedProgress([
      complete,
      { ...complete, hasSds: false },
      { ...complete, locationId: null },
      { ...complete, listingStatusCode: "pending_review" },
      { ...complete, listingStatusCode: "published" },
    ]),
    { completeDetails: 1, addSds: 1, ready: 1, done: 2 },
  );
});

test("only .xlsx files within 2 MB are uploaded", () => {
  assert.equal(workbookFileProblem({ name: "listings.xlsx", size: 1000 }), null);
  assert.equal(workbookFileProblem({ name: "LISTINGS.XLSX", size: 1000 }), null);
  assert.match(workbookFileProblem({ name: "listings.csv", size: 1000 }) ?? "", /\.xlsx/);
  assert.match(workbookFileProblem({ name: "listings.xlsx", size: 0 }) ?? "", /empty/);
  assert.match(workbookFileProblem({ name: "listings.xlsx", size: 2 * 1024 * 1024 + 1 }) ?? "", /2 MB/);
});

test("only import preview and commit POSTs get the long proxy deadline", () => {
  assert.equal(isListingImportWrite("/api/listing-imports/preview", "POST"), true);
  assert.equal(isListingImportWrite("/api/listing-imports/1b4e28ba-2fa1-11d2-883f-0016d3cca427/commit", "POST"), true);
  assert.equal(isListingImportWrite("/api/listing-imports/preview", "GET"), false);
  assert.equal(isListingImportWrite("/api/listing-imports/template", "POST"), false);
  assert.equal(isListingImportWrite("/api/listing-imports/not-a-uuid/commit", "POST"), false);
});

test("SDS files match imported listings by title, never by guess", () => {
  const listings = [
    { id: 1, title: "Biochar" },
    { id: 2, title: "Used Pallets (Grade B)" },
    { id: 3, title: "Hydrochar" },
    { id: 4, title: "hydrochar" },
  ];
  const result = matchSdsFiles(
    ["Biochar - SDS.pdf", "used-pallets-grade-b.PDF", "Hydrochar.pdf", "Unknown.pdf", "biochar.pdf"],
    listings,
  );
  assert.deepEqual(result.matches, [
    { fileIndex: 0, listingId: 1 },
    { fileIndex: 1, listingId: 2 },
  ]);
  assert.deepEqual(result.ambiguous, [2]);
  assert.deepEqual(result.unmatched, [3, 4]);
  assert.equal(sdsMatchKey("MSDS_Refined UCO.pdf"), "refined uco");
});

test("the complete-details form applies the backend submit rules", () => {
  const draft = detailsDraftFrom({ ...complete, quantity: null, pricePerUnit: null, currencyCode: null, locationId: null });
  assert.deepEqual(draft, { quantity: "", quantityUnit: "tonnes", minimumOrderQuantity: "5", pricePerUnit: "", currencyCode: "USD", locationId: "" });
  const filled = { ...draft, quantity: "1,200", pricePerUnit: "$45.50", currencyCode: "usd", locationId: "7" };
  assert.deepEqual(parseDetailsDraft(filled), {
    body: { quantity: 1200, quantityUnit: "tonnes", minimumOrderQuantity: 5, pricePerUnit: 45.5, currencyCode: "USD", locationId: 7 },
  });
  assert.deepEqual(parseDetailsDraft({ ...filled, quantity: "0" }), { error: "Enter a quantity greater than 0." });
  assert.deepEqual(parseDetailsDraft({ ...filled, minimumOrderQuantity: "5000" }), { error: "The minimum order cannot be more than the quantity." });
  assert.deepEqual(parseDetailsDraft({ ...filled, pricePerUnit: "" }), { error: "Enter a price per unit." });
  assert.deepEqual(parseDetailsDraft({ ...filled, pricePerUnit: "0" }).hasOwnProperty("body"), true);
  assert.deepEqual(parseDetailsDraft({ ...filled, currencyCode: "US" }), { error: "Enter a three-letter currency code, such as USD." });
  assert.deepEqual(parseDetailsDraft({ ...filled, locationId: "" }), { error: "Choose a facility." });
  assert.deepEqual(parseDetailsDraft({ ...filled, quantityUnit: "bags" }), { error: "Choose a unit." });
});
