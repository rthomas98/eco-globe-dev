import assert from "node:assert/strict";
import test from "node:test";
import { buildResendPayload } from "./email.js";

test("local email delivery overrides all recipients to Kate", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverride = process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL;

  process.env.NODE_ENV = "development";
  delete process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL;

  const payload = buildResendPayload({
    to: "buyer@example.com",
    subject: "  Integration test  ",
    html: "<p>It works.</p>",
  });

  assert.deepEqual(payload.to, ["kate@leapprosolutions.com"]);
  assert.equal(payload.from, "noreply@ecoglobeworld.com");
  assert.equal(payload.subject, "Integration test");

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousOverride === undefined)
    delete process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL;
  else process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL = previousOverride;
});

test("production sends retain explicit recipients when override is disabled", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverride = process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL;

  process.env.NODE_ENV = "production";
  process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL = "false";

  const payload = buildResendPayload({
    to: ["buyer@example.com", "ops@example.com"],
    subject: "Production notification",
    html: "<p>Order update.</p>",
  });

  assert.deepEqual(payload.to, ["buyer@example.com", "ops@example.com"]);

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousOverride === undefined)
    delete process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL;
  else process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL = previousOverride;
});
