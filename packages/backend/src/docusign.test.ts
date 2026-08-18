import assert from "node:assert/strict";
import { createHmac, createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";
import {
  buildTemplateEnvelope,
  createDocusignJwt,
  verifyDocusignHmac,
  type DocusignConfig,
} from "./docusign.js";

function testConfig(): DocusignConfig {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    environment: "demo",
    integrationKey: "integration-key",
    userId: "user-id",
    accountId: "account-id",
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    baseUri: "https://demo.docusign.net",
    buyerRoleName: "Buyer",
    sellerRoleName: "Seller",
    returnUrl: "https://app.example/signing/complete",
    webhookHmacSecret: "webhook-secret",
  };
}

test("creates a correctly scoped, signed DocuSign JWT assertion", () => {
  const config = testConfig();
  const jwt = createDocusignJwt(config, 1_700_000_000);
  const [header, payload, signature] = jwt.split(".");
  assert.ok(header && payload && signature);
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), {
    alg: "RS256",
    typ: "JWT",
  });
  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url").toString()), {
    iss: "integration-key",
    sub: "user-id",
    aud: "account-d.docusign.com",
    iat: 1_700_000_000,
    exp: 1_700_003_600,
    scope: "signature impersonation",
  });
  const publicKey = createPublicKey(config.privateKey);
  assert.equal(
    verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url")),
    true,
  );
});

test("builds a hybrid embedded and email template envelope for both parties", () => {
  const config = testConfig();
  const envelope = buildTemplateEnvelope({
    contractId: 42,
    title: "Biomass supply agreement",
    templateId: "template-id",
    config,
    signers: [
      { signatureId: 1, role: "buyer", name: "Buyer User", email: "buyer@example.com", clientUserId: "buyer-1" },
      { signatureId: 2, role: "seller", name: "Seller User", email: "seller@example.com", clientUserId: "seller-2" },
    ],
  });
  assert.equal(envelope.status, "sent");
  assert.equal(envelope.templateRoles[0]?.roleName, "Buyer");
  assert.equal(envelope.templateRoles[1]?.roleName, "Seller");
  assert.equal(envelope.templateRoles[0]?.embeddedRecipientStartURL, "SIGN_AT_DOCUSIGN");
  assert.equal(envelope.customFields.textCustomFields[0]?.value, "42");
});

test("accepts only the matching DocuSign Connect HMAC", () => {
  const body = Buffer.from('{"event":"envelope-completed"}');
  const signature = createHmac("sha256", "webhook-secret").update(body).digest("base64");
  assert.equal(verifyDocusignHmac(body, signature, "webhook-secret"), true);
  assert.equal(verifyDocusignHmac(body, signature, "wrong-secret"), false);
  assert.equal(verifyDocusignHmac(body, undefined, "webhook-secret"), false);
});
