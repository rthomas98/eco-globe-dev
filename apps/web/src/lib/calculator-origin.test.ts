import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatorOrigin } from "./calculator-origin.ts";

const tar = { id: "19", title: "Tar" };

test("detail entry closes the overlay and names the origin listing", () => {
  assert.deepEqual(calculatorOrigin(tar), { kind: "close", label: "Back to Tar" });
  assert.deepEqual(calculatorOrigin(tar, "detail"), { kind: "close", label: "Back to Tar" });
});

test("browse card entry links to that listing's detail in the same portal", () => {
  assert.deepEqual(calculatorOrigin(tar, "public-browse"), { kind: "link", label: "Back to Tar", href: "/browse/19" });
  assert.deepEqual(calculatorOrigin(tar, "buyer-browse"), { kind: "link", label: "Back to Tar", href: "/buyer/browse/19" });
});

test("hrefs are built from the listing id only and cannot escape the detail route", () => {
  const origin = calculatorOrigin({ id: "../../admin?x=//evil.example", title: "X" }, "public-browse");
  assert.equal(origin?.kind, "link");
  assert.ok(origin?.kind === "link" && origin.href.startsWith("/browse/") && !origin.href.slice("/browse/".length).includes("/"));
});

test("blank titles fall back to a generic label", () => {
  assert.equal(calculatorOrigin({ id: "7", title: "  " })?.label, "Back to listing");
});

test("standalone calculator has no listing origin", () => {
  assert.equal(calculatorOrigin(undefined), null);
  assert.equal(calculatorOrigin(null, "buyer-browse"), null);
  assert.equal(calculatorOrigin({ id: "", title: "Tar" }), null);
});
