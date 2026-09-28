import assert from "node:assert/strict";
import {
  createHmac,
  createPublicKey,
  generateKeyPairSync,
  verify,
} from "node:crypto";
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
    verify(
      "RSA-SHA256",
      Buffer.from(`${header}.${payload}`),
      publicKey,
      Buffer.from(signature, "base64url"),
    ),
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
      {
        signatureId: 1,
        role: "buyer",
        name: "Buyer User",
        email: "buyer@example.com",
        clientUserId: "buyer-1",
      },
      {
        signatureId: 2,
        role: "seller",
        name: "Seller User",
        email: "seller@example.com",
        clientUserId: "seller-2",
      },
    ],
  });
  assert.equal(envelope.status, "sent");
  assert.equal(envelope.templateRoles[0]?.roleName, "Buyer");
  assert.equal(envelope.templateRoles[1]?.roleName, "Seller");
  assert.equal(
    envelope.templateRoles[0]?.embeddedRecipientStartURL,
    "SIGN_AT_DOCUSIGN",
  );
  assert.equal(envelope.customFields.textCustomFields[0]?.value, "42");
});

test("accepts only the matching DocuSign Connect HMAC", () => {
  const body = Buffer.from('{"event":"envelope-completed"}');
  const signature = createHmac("sha256", "webhook-secret")
    .update(body)
    .digest("base64");
  assert.equal(verifyDocusignHmac(body, signature, "webhook-secret"), true);
  assert.equal(verifyDocusignHmac(body, signature, "wrong-secret"), false);
  assert.equal(verifyDocusignHmac(body, undefined, "webhook-secret"), false);
});

test("rejects forged signature evidence for all callers", async () => {
  const {
    rejectSignatureEvidence,
    rejectContractEvidence,
    requireAssignedSigner,
    signingReturnUrl,
  } = await import("./docusign-policy.js");
  for (const body of [
    { signatureStatusCode: "signed" },
    { signedAt: new Date().toISOString() },
    { signedDocumentUrl: "https://forged.example/doc" },
    { providerSignatureId: "forged" },
  ]) {
    assert.throws(() => rejectSignatureEvidence(body));
  }
  assert.doesNotThrow(() =>
    rejectSignatureEvidence({ signatureStatusCode: "not_sent" }),
  );
  assert.throws(() => rejectContractEvidence({ contractStatusCode: "active" }));
  assert.throws(() =>
    rejectContractEvidence({ signedDocumentUrl: "https://forged.example" }),
  );
  assert.doesNotThrow(() =>
    rejectContractEvidence({ contractStatusCode: "draft" }),
  );
  assert.throws(() => requireAssignedSigner({ userId: 1, isAdmin: true }, 2));
  assert.throws(() =>
    requireAssignedSigner({ userId: 1, companyId: 2, isAdmin: false }, 2),
  );
  assert.doesNotThrow(() =>
    requireAssignedSigner({ userId: 2, isAdmin: false }, 2),
  );
  const configured = "https://app.example/seller/e-signatures?docusign=return";
  assert.equal(
    signingReturnUrl(
      "https://app.example/buyer/e-signatures?docusign=return",
      configured,
    ),
    "https://app.example/buyer/e-signatures?docusign=return",
  );
  for (const target of [
    "https://evil.example/seller/e-signatures",
    "https://app.example/other",
    "https://user:password@app.example/seller/e-signatures",
  ]) {
    assert.throws(() => signingReturnUrl(target, configured));
  }
});

test("archive readiness rejects write-only, expired and insecure SAS configuration", async () => {
  const { hasArchivePermissions } = await import("./docusign.js");
  assert.equal(
    hasArchivePermissions("https://storage.example/docs?sp=cw&se=2099-01-01"),
    false,
  );
  assert.equal(
    hasArchivePermissions("https://storage.example/docs?sp=rcw&se=2000-01-01"),
    false,
  );
  assert.equal(
    hasArchivePermissions("http://storage.example/docs?sp=rcw&se=2099-01-01"),
    false,
  );
  assert.equal(
    hasArchivePermissions("https://storage.example/docs?sp=rcw&se=2099-01-01"),
    true,
  );
  assert.equal(
    verifyDocusignHmac(
      Buffer.from("body"),
      createHmac("sha256", "").update("body").digest("base64"),
      "",
    ),
    false,
  );
});

test("the same person signing for two companies retains separate recipient turns", () => {
  const signers = [
    {signatureId:1,role:'buyer' as const,name:'Sandbox Tester',email:'test@example.com',clientUserId:'buyer'},
    {signatureId:2,role:'seller' as const,name:'Sandbox Tester',email:'test@example.com',clientUserId:'seller'},
  ];
  const result=buildTemplateEnvelope({contractId:1,title:'test',templateId:'test',signers,config:testConfig(),transactionId:'unique-send-attempt'});
  assert.deepEqual(result.templateRoles.map(role=>role.routingOrder),['1','2']);
  assert.deepEqual(result.templateRoles.map(role=>role.clientUserId),['buyer','seller']);
  assert.equal(result.transactionId,'unique-send-attempt');
});
