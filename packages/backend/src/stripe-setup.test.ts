import test from "node:test";
import assert from "node:assert/strict";
import { stripeConfiguration, stripeReturnUrl } from "./stripe-setup.js";

test("Stripe setup fails closed and separates test/live credentials", () => {
  const previous = { ...process.env };
  try {
    delete process.env.STRIPE_SECRET_KEY;
    assert.throws(stripeConfiguration, /not configured/);
    process.env.STRIPE_PLATFORM_ACCOUNT_ID = "acct_test";
    process.env.STRIPE_MODE = "test";
    process.env.STRIPE_SECRET_KEY = "rk_live_fake";
    assert.throws(stripeConfiguration, /do not match/);
    process.env.STRIPE_SECRET_KEY = "rk_test_fake";
    assert.equal(stripeConfiguration().live, false);
  } finally {
    process.env = previous;
  }
});

test("Stripe returns reject external origins and credential-bearing URLs", () => {
  const previous = { ...process.env };
  try {
    process.env.ECOGLOBE_WEB_URL = "https://example.com";
    process.env.STRIPE_RETURN_ORIGINS = "https://example.com";
    assert.equal(
      stripeReturnUrl(undefined, "buyer"),
      "https://example.com/buyer/accounting/payments",
    );
    assert.throws(
      () => stripeReturnUrl("https://evil.example/", "buyer"),
      /not allowed/,
    );
    assert.throws(
      () => stripeReturnUrl("https://user:password@example.com/", "buyer"),
      /not allowed/,
    );
    assert.equal(
      stripeReturnUrl(
        "https://example.com/buyer/accounting/payments?stripe=success#fake",
        "buyer",
      ),
      "https://example.com/buyer/accounting/payments",
    );
  } finally {
    process.env = previous;
  }
});
