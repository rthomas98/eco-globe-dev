import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  REPORT_LOGO_HEIGHT,
  REPORT_LOGO_PATH,
  REPORT_LOGO_WIDTH,
  reportLogoHtml,
  reportLogoUrl,
} from "./report-branding.ts";

test("the report logo resolves to an absolute URL on the app origin", () => {
  assert.equal(reportLogoUrl("http://127.0.0.1:4123"), "http://127.0.0.1:4123/images/ecoglobe-report-logo.png");
});

test("the report logo asset exists with the declared intrinsic size", () => {
  const file = new URL(`../../public${REPORT_LOGO_PATH}`, import.meta.url);
  assert.ok(existsSync(file));
  const png = readFileSync(file);
  assert.equal(png.readUInt32BE(16), REPORT_LOGO_WIDTH);
  assert.equal(png.readUInt32BE(20), REPORT_LOGO_HEIGHT);
});

test("logo markup keeps the aspect ratio and escapes the URL", () => {
  const html = reportLogoHtml('https://example.test/a"b<c>.png');
  assert.match(html, /height:auto/);
  assert.match(html, /width="1200" height="376"/);
  assert.match(html, /alt="EcoGlobe"/);
  assert.ok(html.includes("a&quot;b&lt;c&gt;.png"));
  assert.ok(!html.includes('a"b'));
});
