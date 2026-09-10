import test from "node:test";
import assert from "node:assert/strict";
import {
  shippingMode,
  parcelRates,
  paymentConfirmed,
  buyParcel,
  voidParcel,
} from "./sample-shipping-provider.js";
import { sampleBox } from "./sample-shipping-domain.js";
function testEnvironment(t: { after: (f: () => void) => void }) {
  const prior = { ...process.env };
  Object.assign(process.env, {
    NODE_ENV: "development",
    SAMPLE_SHIPPING_MODE: "easypost_test",
    EASYPOST_API_KEY: "EZTK_TEST_FIXTURE",
    STRIPE_SECRET_KEY: "sk_test_FIXTURE",
    SAMPLE_CHECKOUT_ORIGIN: "http://127.0.0.1:20016",
  });
  t.after(() => {
    for (const key of Object.keys(process.env))
      if (!(key in prior)) delete process.env[key];
    Object.assign(process.env, prior);
  });
}
test("production cannot enable simulated or unverified paid shipping", (t) => {
  testEnvironment(t);
  process.env.NODE_ENV = "production";
  process.env.SAMPLE_SHIPPING_MODE = "simulation";
  process.env.ECOGLOBE_LOCAL_SAMPLE_TEST = "1";
  assert.equal(shippingMode(), "unavailable");
  process.env.NODE_ENV = "development";
  process.env.SAMPLE_SHIPPING_MODE = "easypost_test";
  process.env.STRIPE_SECRET_KEY = "sk_live_NOT_A_KEY";
  assert.equal(shippingMode(), "unavailable");
});
test("carrier request uses configured dimensions in inches and packed weight in ounces, and filters unsupported rates", async (t) => {
  testEnvironment(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    calls++;
    if (calls === 1)
      return Response.json({
        id: "adr_test",
        residential: false,
        verifications: { delivery: { success: true } },
      });
    const body = JSON.parse(String(init?.body));
    assert.equal(body.shipment.parcel.length, 40 / 2.54);
    assert.equal(body.shipment.parcel.weight, 10 * 35.27396195);
    return Response.json({
      id: "shp_test",
      mode: "test",
      rates: [
        {
          id: "rate_1",
          carrier: "UPS",
          service: "Ground",
          rate: "31.60",
          currency: "USD",
        },
        {
          id: "rate_2",
          carrier: "USPS",
          service: "Express",
          rate: "5.00",
          currency: "USD",
        },
      ],
    });
  });
  const address = {
    company: "Synthetic site",
    street1: "1 Test Street",
    street2: "",
    city: "Austin",
    state: "TX",
    zip: "78701",
    country: "US",
  };
  const result = await parcelRates(address, address, sampleBox("medium"));
  assert.equal(result.rates.length, 1);
  assert.equal(result.rates[0]?.cents, 3160);
});
test("a paid redirect or mismatched provider amount is not accepted as payment proof", async (t) => {
  testEnvironment(t);
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      payment_status: "paid",
      amount_total: 1,
      currency: "usd",
      client_reference_id: "10",
      livemode: false,
      payment_intent: "pi_test",
    }),
  );
  await assert.rejects(paymentConfirmed("cs_test", 3160, 10), /does not match/);
});
test("retry retrieves an already purchased label instead of buying another", async (t) => {
  testEnvironment(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert.equal(init?.method, "GET");
    return Response.json({
      selected_rate: { id: "rate_1" },
      tracking_code: "TEST_TRACKING",
      postage_label: { label_url: "https://example.com/test-label.pdf" },
    });
  });
  assert.equal(
    (await buyParcel("shp_test", "rate_1")).tracking,
    "TEST_TRACKING",
  );
  assert.equal(calls, 1);
});
test("an asynchronous carrier refund is not presented as a completed label void", async (t) => {
  testEnvironment(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({
      postage_label: { label_url: "https://example.com/test.pdf" },
      refund_status: "submitted",
    });
  });
  assert.equal(await voidParcel("shp_test"), false);
  assert.equal(calls, 1);
});
