import assert from "node:assert/strict";
import { ApiError } from "./http.js";
import { test } from "node:test";
import {
  validateFedExInput,
  fedexCall,
  FedExRejectedError,
  fedexBook,
  fedexConfig,
} from "./fedex-sandbox-provider.js";
const address = {
  name: "Sandbox Tester",
  phone: "9015550100",
  street1: "10 Test Street",
  city: "Memphis",
  stateOrProvince: "TN",
  postalCode: "38116",
  countryCode: "US",
};
const input = {
  service: "STANDARD_OVERNIGHT",
  shipper: address,
  recipient: address,
  package: { weightLb: 1, lengthIn: 10, widthIn: 5, heightIn: 5 },
};
test("validates parcel boundaries and optional fields", () => {
  assert.equal(
    validateFedExInput({
      ...input,
      shipper: { ...address, company: null, street2: null },
    }).shipper.company,
    "",
  );
  for (const bad of [
    { ...input, package: null },
    { ...input, shipper: [] },
    { ...input, service: "FEDEX_GROUND" },
    { ...input, package: { ...input.package, weightLb: 151 } },
    { ...input, package: { ...input.package, lengthIn: 100, widthIn: 30 } },
    { ...input, recipient: { ...address, countryCode: "CA" } },
  ])
    assert.throws(
      () => validateFedExInput(bad),
      (e: unknown) => e instanceof ApiError && e.status === 400,
    );
});
test("sandbox requires an explicit mode", () => {
  const old = process.env.FEDEX_MODE;
  process.env.FEDEX_MODE = "production";
  try {
    assert.throws(() => fedexConfig());
  } finally {
    if (old === undefined) delete process.env.FEDEX_MODE;
    else process.env.FEDEX_MODE = old;
  }
});
test("provider rejection is distinguishable from ambiguous network failure", async () => {
  const old = globalThis.fetch;
  Object.assign(process.env, {
    FEDEX_MODE: "sandbox",
    FEDEX_CLIENT_ID: "unit-test",
    FEDEX_CLIENT_SECRET: "unit-test",
    FEDEX_ACCOUNT_NUMBER: "unit-test",
  });
  try {
    globalThis.fetch = async (url) =>
      String(url).endsWith("/oauth/token")
        ? new Response(
            JSON.stringify({ access_token: "unit-token", expires_in: 3600 }),
          )
        : new Response(
            JSON.stringify({
              errors: [
                {
                  code: "GROUND.SHIPPING.NOTAUTHORIZED",
                  message: "secret provider text",
                },
              ],
            }),
            { status: 400 },
          );
    await assert.rejects(
      fedexCall("/ship/v1/shipments", {}),
      (e: unknown) =>
        e instanceof FedExRejectedError &&
        !e.message.includes("secret provider text"),
    );
    globalThis.fetch = async () => {
      throw new TypeError("network failure");
    };
    await assert.rejects(
      fedexCall("/ship/v1/shipments", {}),
      (e: unknown) => !(e instanceof FedExRejectedError),
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          output: {
            transactionShipments: [
              {
                masterTrackingNumber: "794876503447",
                pieceResponses: [
                  {
                    packageDocuments: [
                      {
                        encodedLabel:
                          Buffer.from("not a PDF").toString("base64"),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      );
    await assert.rejects(
      fedexBook(validateFedExInput(input), "FX-TEST-unit"),
      /invalid PDF/,
    );
  } finally {
    globalThis.fetch = old;
  }
});
