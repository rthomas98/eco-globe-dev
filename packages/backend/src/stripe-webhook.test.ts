import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { verifyStripeWebhook } from "./stripe-webhook.js";

const secret = "whsec_unit_test_only";
const payload = JSON.stringify({
  id: "evt_test",
  type: "payment_intent.succeeded",
  livemode: false,
  data: { object: { id: "pi_test" } },
});
const sign = (body = payload, timestamp = Math.floor(Date.now() / 1000)) =>
  Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
    timestamp,
  });

test("webhooks fail closed without configuration or signature", () => {
  assert.throws(
    () => verifyStripeWebhook(payload, sign(), undefined),
    /not configured/,
  );
  assert.throws(
    () => verifyStripeWebhook(payload, undefined, secret),
    /Missing/,
  );
});
test("valid events pass; modified, stale and wrong-secret deliveries fail", () => {
  assert.equal(verifyStripeWebhook(payload, sign(), secret).id, "evt_test");
  assert.throws(
    () => verifyStripeWebhook(payload + " ", sign(), secret),
    /verification failed/,
  );
  assert.throws(
    () =>
      verifyStripeWebhook(
        payload,
        sign(payload, Math.floor(Date.now() / 1000) - 600),
        secret,
      ),
    /verification failed/,
  );
  assert.throws(
    () => verifyStripeWebhook(payload, sign(), "whsec_other"),
    /verification failed/,
  );
});
test("signature rotation accepts any valid v1 signature and rejects invalid event shapes", () => {
  assert.equal(
    verifyStripeWebhook(payload, sign() + ",v1=invalid", secret).id,
    "evt_test",
  );
  for (const body of [
    "null",
    "{}",
    JSON.stringify({ id: "evt_bad", type: "test", data: { object: {} } }),
  ]) {
    assert.throws(() => verifyStripeWebhook(body, sign(body), secret));
  }
});
