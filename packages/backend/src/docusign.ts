import { createHmac, createSign, timingSafeEqual } from "node:crypto";
import { ApiError } from "./http.js";

export type DocusignEnvironment = "demo" | "production";

export type DocusignConfig = {
  environment: DocusignEnvironment;
  integrationKey: string;
  userId: string;
  accountId: string;
  privateKey: string;
  baseUri: string;
  templateId?: string;
  buyerRoleName: string;
  sellerRoleName: string;
  returnUrl: string;
  webhookHmacSecret: string;
  signedDocumentsContainerSasUrl?: string;
};

export type DocusignSigner = {
  signatureId: number;
  role: "buyer" | "seller";
  name: string;
  email: string;
  clientUserId: string;
};

export type DocusignEnvelopeResult = {
  envelopeId: string;
  status: string;
  statusDateTime?: string;
  uri?: string;
};

type TokenCache = { accessToken: string; expiresAt: number };
let tokenCache: TokenCache | undefined;

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new ApiError(503, `${name} is not configured.`);
  return value;
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

export function getDocusignConfig(): DocusignConfig {
  const environment = process.env.DOCUSIGN_ENVIRONMENT === "production" ? "production" : "demo";
  return {
    environment,
    integrationKey: requireEnv("DOCUSIGN_INTEGRATION_KEY"),
    userId: requireEnv("DOCUSIGN_USER_ID"),
    accountId: requireEnv("DOCUSIGN_ACCOUNT_ID"),
    privateKey: normalizePrivateKey(requireEnv("DOCUSIGN_PRIVATE_KEY")),
    baseUri: (
      process.env.DOCUSIGN_BASE_URI?.trim() ||
      (environment === "demo" ? "https://demo.docusign.net" : requireEnv("DOCUSIGN_BASE_URI"))
    ).replace(/\/$/, ""),
    templateId: process.env.DOCUSIGN_TEMPLATE_ID?.trim() || undefined,
    buyerRoleName: process.env.DOCUSIGN_BUYER_ROLE_NAME?.trim() || "Buyer",
    sellerRoleName: process.env.DOCUSIGN_SELLER_ROLE_NAME?.trim() || "Seller",
    returnUrl: requireEnv("DOCUSIGN_RETURN_URL"),
    webhookHmacSecret: requireEnv("DOCUSIGN_WEBHOOK_HMAC_SECRET"),
    signedDocumentsContainerSasUrl:
      process.env.AZURE_SIGNED_DOCUMENTS_CONTAINER_SAS_URL?.trim() || undefined,
  };
}

export function getDocusignConfigurationStatus() {
  const required = [
    "DOCUSIGN_INTEGRATION_KEY",
    "DOCUSIGN_USER_ID",
    "DOCUSIGN_ACCOUNT_ID",
    "DOCUSIGN_PRIVATE_KEY",
    "DOCUSIGN_RETURN_URL",
    "DOCUSIGN_WEBHOOK_HMAC_SECRET",
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());
  return {
    configured: missing.length === 0,
    environment: process.env.DOCUSIGN_ENVIRONMENT === "production" ? "production" : "demo",
    templateConfigured: Boolean(process.env.DOCUSIGN_TEMPLATE_ID?.trim()),
    immutableStorageConfigured: Boolean(
      process.env.AZURE_SIGNED_DOCUMENTS_CONTAINER_SAS_URL?.trim(),
    ),
    missing,
  };
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function createDocusignJwt(config: DocusignConfig, nowSeconds = Math.floor(Date.now() / 1000)) {
  const authServer =
    config.environment === "demo" ? "account-d.docusign.com" : "account.docusign.com";
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: config.integrationKey,
      sub: config.userId,
      aud: authServer,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
      scope: "signature impersonation",
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(config.privateKey).toString("base64url")}`;
}

async function getAccessToken(config: DocusignConfig) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken;

  const authServer =
    config.environment === "demo" ? "account-d.docusign.com" : "account.docusign.com";
  const response = await fetch(`https://${authServer}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createDocusignJwt(config),
    }),
  });
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token) {
    const message =
      payload.error === "consent_required"
        ? "DocuSign consent is required for the configured integration user."
        : payload.error_description || payload.error || "DocuSign authentication failed.";
    throw new ApiError(502, message);
  }
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000,
  };
  return tokenCache.accessToken;
}

async function docusignFetch<T>(
  config: DocusignConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${config.baseUri}/restapi/v2.1/accounts/${config.accountId}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${await getAccessToken(config)}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    let message = `DocuSign request failed with status ${response.status}.`;
    try {
      const payload = JSON.parse(text) as { message?: string; errorCode?: string };
      message = payload.message || payload.errorCode || message;
    } catch {
      // Preserve the status-only message when DocuSign returns non-JSON content.
    }
    throw new ApiError(502, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function buildTemplateEnvelope({
  contractId,
  title,
  templateId,
  signers,
  config,
}: {
  contractId: number;
  title: string;
  templateId: string;
  signers: DocusignSigner[];
  config: DocusignConfig;
}) {
  return {
    emailSubject: `EcoGlobe agreement: ${title}`,
    status: "sent",
    templateId,
    templateRoles: signers.map((signer) => ({
      roleName: signer.role === "buyer" ? config.buyerRoleName : config.sellerRoleName,
      name: signer.name,
      email: signer.email,
      clientUserId: signer.clientUserId,
      embeddedRecipientStartURL: "SIGN_AT_DOCUSIGN",
    })),
    customFields: {
      textCustomFields: [
        { name: "EcoGlobeContractId", value: String(contractId), show: "false", required: "false" },
      ],
    },
  };
}

export async function createDocusignEnvelope(input: {
  contractId: number;
  title: string;
  signers: DocusignSigner[];
  templateId?: string;
}) {
  const config = getDocusignConfig();
  const templateId = input.templateId || config.templateId;
  if (!templateId) throw new ApiError(400, "A DocuSign template ID is required.");
  if (input.signers.length === 0) throw new ApiError(400, "At least one signer is required.");
  return docusignFetch<DocusignEnvelopeResult>(config, "/envelopes", {
    method: "POST",
    body: JSON.stringify(buildTemplateEnvelope({ ...input, templateId, config })),
  });
}

export async function createDocusignRecipientView(input: {
  envelopeId: string;
  signer: DocusignSigner;
  returnUrl?: string;
}) {
  const config = getDocusignConfig();
  return docusignFetch<{ url: string }>(
    config,
    `/envelopes/${encodeURIComponent(input.envelopeId)}/views/recipient`,
    {
      method: "POST",
      body: JSON.stringify({
        authenticationMethod: "none",
        clientUserId: input.signer.clientUserId,
        email: input.signer.email,
        userName: input.signer.name,
        returnUrl: input.returnUrl || config.returnUrl,
      }),
    },
  );
}

export async function getDocusignEnvelope(envelopeId: string) {
  return docusignFetch<Record<string, unknown>>(
    getDocusignConfig(),
    `/envelopes/${encodeURIComponent(envelopeId)}`,
  );
}

export async function getDocusignRecipients(envelopeId: string) {
  return docusignFetch<{ signers?: Array<Record<string, unknown>> }>(
    getDocusignConfig(),
    `/envelopes/${encodeURIComponent(envelopeId)}/recipients`,
  );
}

async function downloadDocusignDocument(envelopeId: string, documentId: "combined" | "certificate") {
  const config = getDocusignConfig();
  const response = await fetch(
    `${config.baseUri}/restapi/v2.1/accounts/${config.accountId}/envelopes/${encodeURIComponent(envelopeId)}/documents/${documentId}`,
    { headers: { authorization: `Bearer ${await getAccessToken(config)}` } },
  );
  if (!response.ok) throw new ApiError(502, `DocuSign ${documentId} download failed.`);
  return Buffer.from(await response.arrayBuffer());
}

export async function archiveCompletedEnvelope(envelopeId: string) {
  const config = getDocusignConfig();
  if (!config.signedDocumentsContainerSasUrl) {
    throw new ApiError(503, "Azure signed-document storage is not configured.");
  }
  const [agreement, certificate] = await Promise.all([
    downloadDocusignDocument(envelopeId, "combined"),
    downloadDocusignDocument(envelopeId, "certificate"),
  ]);
  const upload = async (name: string, body: Buffer) => {
    const base = config.signedDocumentsContainerSasUrl as string;
    const separator = base.includes("?") ? "?" : "";
    const [container, query = ""] = base.split("?", 2);
    const url = `${container.replace(/\/$/, "")}/${encodeURIComponent(envelopeId)}/${name}${separator}${query}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { "x-ms-blob-type": "BlockBlob", "content-type": "application/pdf" },
      body,
    });
    if (!response.ok) throw new ApiError(502, `Azure archive upload failed with status ${response.status}.`);
    return url.split("?", 1)[0] as string;
  };
  const [signedDocumentUrl, certificateUrl] = await Promise.all([
    upload("agreement.pdf", agreement),
    upload("certificate.pdf", certificate),
  ]);
  return { signedDocumentUrl, certificateUrl };
}

export async function readArchivedDocusignDocument(documentUrl: string) {
  const config = getDocusignConfig();
  if (!config.signedDocumentsContainerSasUrl) {
    throw new ApiError(503, "Azure signed-document storage is not configured.");
  }
  const container = new URL(config.signedDocumentsContainerSasUrl);
  const document = new URL(documentUrl);
  const normalizedContainerPath = container.pathname.replace(/\/$/, "");
  if (document.origin !== container.origin || !document.pathname.startsWith(`${normalizedContainerPath}/`)) {
    throw new ApiError(500, "The archived document URL is outside the configured container.");
  }
  document.search = container.search;
  const response = await fetch(document);
  if (!response.ok) throw new ApiError(502, "The archived DocuSign document could not be read.");
  return Buffer.from(await response.arrayBuffer());
}

export function verifyDocusignHmac(rawBody: Buffer, signature: string | undefined, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
