import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequestGuard, downloadNotice, fetchPdf, hasPdfHeader, isPdfContentType, noticeForOpenRecord } from "./browser-download.ts";

const pdfBytes = new Blob(["%PDF-1.7\n%EcoGlobe invoice EG-20\n"], { type: "application/pdf" });

test("download notices say the download started, never that it finished", () => {
  const label = "EG-20 invoice PDF";
  assert.equal(downloadNotice("pending", label), "Preparing EG-20 invoice PDF…");
  const handed = downloadNotice("handed", label);
  assert.equal(handed, "Download started for EG-20 invoice PDF. Check your browser downloads.");
  assert.doesNotMatch(handed, /handed to your browser|\bdownloaded\b|complete|paid/i);
  assert.equal(downloadNotice("error", label, "Order not found."), "EG-20 invoice PDF was not downloaded. Order not found.");
  assert.equal(downloadNotice("error", label, "  "), "EG-20 invoice PDF was not downloaded. Please try again.");
});

test("only a PDF-typed response whose bytes start with %PDF- is handed on, with the backend's file name", async () => {
  assert.deepEqual(
    await fetchPdf(async () => ({ blob: pdfBytes, contentType: "application/pdf; charset=binary", fileName: "ecoglobe-invoice-EG-20.pdf" }), "fallback.pdf"),
    { blob: pdfBytes, fileName: "ecoglobe-invoice-EG-20.pdf" },
  );
  assert.equal((await fetchPdf(async () => ({ blob: pdfBytes, contentType: "application/pdf", fileName: null }), "ecoglobe-invoice-EG-20.pdf")).fileName, "ecoglobe-invoice-EG-20.pdf");
});

test("HTML, JSON, empty, plaintext or mislabelled non-PDF bytes are refused instead of being saved as a fake PDF", async () => {
  const cases = [
    { blob: new Blob(["<html>login</html>"]), contentType: "text/html", fileName: "x.pdf" },
    { blob: new Blob(['{"ok":true}']), contentType: "application/json", fileName: null },
    { blob: new Blob([]), contentType: "application/pdf", fileName: null },
    { blob: new Blob(["EcoGlobe order invoice"]), contentType: "text/plain", fileName: "EG-20-invoice.txt" },
    // Correct MIME type but an HTML error body, and a truncated header.
    { blob: new Blob(["<!doctype html><p>Sign in</p>"]), contentType: "application/pdf", fileName: "x.pdf" },
    { blob: new Blob(["%PDF"]), contentType: "application/pdf", fileName: "x.pdf" },
  ];
  for (const response of cases)
    await assert.rejects(fetchPdf(async () => response, "f.pdf"), /did not return a PDF/);
  // Backend errors (e.g. 404 for an order the buyer cannot see) pass through unchanged.
  await assert.rejects(fetchPdf(async () => { throw new Error("Order not found."); }, "f.pdf"), /Order not found/);
  assert.equal(isPdfContentType(null), false);
  assert.equal(isPdfContentType("APPLICATION/PDF"), true);
  assert.equal(await hasPdfHeader(pdfBytes), true);
  assert.equal(await hasPdfHeader(new Blob([" %PDF-1.7"])), false);
});

test("a request started for EG-20 is stale after switching or closing, so its result is dropped", async () => {
  const guard = createRequestGuard();
  // Buyer opens EG-20 and starts the invoice; the response is still in flight.
  const eg20 = guard.begin();
  let release!: () => void;
  const inFlight = new Promise<void>((resolve) => (release = resolve));
  const shown: string[] = [];
  const run = inFlight.then(() => {
    if (guard.isCurrent(eg20)) shown.push("EG-20 result");
  });
  // Buyer switches to EG-25 (or closes the panel) before it returns.
  guard.invalidate();
  release();
  await run;
  assert.deepEqual(shown, []);
  // A fresh request for the order now open is current until the next switch.
  const eg25 = guard.begin();
  assert.equal(guard.isCurrent(eg25), true);
  assert.equal(guard.isCurrent(eg20), false);
  guard.invalidate();
  assert.equal(guard.isCurrent(eg25), false);
});

test("an EG-20 invoice notice is hidden while EG-25 is open or the panel is closed, without clearing it", () => {
  const always = () => true;
  const notice = { orderId: "EG-20", ticket: 1, state: "handed" as const, text: "Download started for EG-20 invoice PDF." };
  assert.equal(noticeForOpenRecord(notice, "EG-20", always), notice);
  assert.equal(noticeForOpenRecord(notice, "EG-25", always), null);
  assert.equal(noticeForOpenRecord(notice, undefined, always), null);
  assert.equal(noticeForOpenRecord(null, "EG-20", always), null);
});

test("EG-20 → EG-25 → EG-20 before the old response lands hides the stale pending notice and allows a fresh request", () => {
  const guard = createRequestGuard();
  // EG-20 invoice starts: pending notice is current and shown.
  const old = { orderId: "EG-20", ticket: guard.begin(), state: "pending" as const, text: "Preparing EG-20 invoice PDF…" };
  assert.equal(noticeForOpenRecord(old, "EG-20", guard.isCurrent), old);
  // Switching to EG-25 invalidates (effect cleanup), then the buyer returns to EG-20.
  guard.invalidate();
  assert.equal(noticeForOpenRecord(old, "EG-25", guard.isCurrent), null);
  assert.equal(noticeForOpenRecord(old, "EG-20", guard.isCurrent), null);
  // A fresh EG-20 request is current and shown; the old ticket stays stale.
  const fresh = { ...old, ticket: guard.begin() };
  assert.equal(noticeForOpenRecord(fresh, "EG-20", guard.isCurrent), fresh);
  assert.equal(guard.isCurrent(old.ticket), false);
  // A finished notice for EG-20 stays visible on EG-20 even after later invalidation.
  const done = { ...fresh, state: "handed" as const };
  guard.invalidate();
  assert.equal(noticeForOpenRecord(done, "EG-20", guard.isCurrent), done);
});
