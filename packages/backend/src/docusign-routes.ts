import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParams,
  sql,
  type QueryParameter,
} from "./database.js";
import {
  archiveCompletedEnvelope,
  createDocusignEnvelope,
  createDocusignRecipientView,
  getDocusignConfig,
  getDocusignConfigurationStatus,
  getDocusignEnvelope,
  getDocusignRecipients,
  readArchivedDocusignDocument,
  verifyDocusignHmac,
  type DocusignSigner,
} from "./docusign.js";
import {
  ApiError,
  corsHeaders,
  getOptionalString,
  matchPath,
  parseId,
  readJsonBody,
  sendJson,
  type AuthContext,
} from "./http.js";

type ContractRow = {
  id: number;
  title: string;
  buyerCompanyId: number;
  sellerCompanyId: number;
  providerEnvelopeId?: string;
  contractStatusCode: string;
};

type SignatureRow = {
  id: number;
  contractId: number;
  signerUserId: number;
  signerCompanyId: number;
  name: string;
  email: string;
  providerClientUserId?: string;
  providerEnvelopeId?: string;
  buyerCompanyId: number;
  sellerCompanyId: number;
  signatureStatusCode: string;
};

function intParam(name: string, value: number | undefined): QueryParameter {
  return { name, type: sql.Int, value };
}

function varcharParam(name: string, value: string | undefined, length = 200): QueryParameter {
  return { name, type: sql.VarChar(length), value };
}

function nvarcharParam(name: string, value: string | undefined, length = 1000): QueryParameter {
  return { name, type: sql.NVarChar(length), value };
}

function requireContractAccess(auth: AuthContext, contract: ContractRow) {
  if (
    !auth.isAdmin &&
    auth.companyId !== contract.buyerCompanyId &&
    auth.companyId !== contract.sellerCompanyId
  ) {
    throw new ApiError(403, "You cannot access another company's contract.");
  }
}

async function loadContract(id: number) {
  const contract = (
    await queryRowsWithParams<ContractRow>(
      `SELECT c.Id AS id, c.Title AS title, c.BuyerCompanyId AS buyerCompanyId,
        c.SellerCompanyId AS sellerCompanyId, c.ProviderEnvelopeId AS providerEnvelopeId,
        cs.Code AS contractStatusCode
       FROM dbo.Contracts c
       INNER JOIN dbo.ContractStatuses cs ON cs.Id = c.ContractStatusId
       WHERE c.Id = @id;`,
      [intParam("id", id)],
    )
  )[0];
  if (!contract) throw new ApiError(404, "Contract not found.");
  return contract;
}

async function loadContractSigners(contract: ContractRow) {
  const rows = await queryRowsWithParams<SignatureRow>(
    `SELECT s.Id AS id, s.ContractId AS contractId, s.SignerUserId AS signerUserId,
      s.SignerCompanyId AS signerCompanyId, u.Name AS name, u.Email AS email,
      s.ProviderClientUserId AS providerClientUserId,
      c.ProviderEnvelopeId AS providerEnvelopeId,
      c.BuyerCompanyId AS buyerCompanyId, c.SellerCompanyId AS sellerCompanyId,
      ss.Code AS signatureStatusCode
     FROM dbo.Signatures s
     INNER JOIN dbo.Users u ON u.Id = s.SignerUserId
     INNER JOIN dbo.Contracts c ON c.Id = s.ContractId
     INNER JOIN dbo.SignatureStatuses ss ON ss.Id = s.SignatureStatusId
     WHERE s.ContractId = @contractId
     ORDER BY s.Id;`,
    [intParam("contractId", contract.id)],
  );
  return rows.map<DocusignSigner & { signatureStatusCode: string }>((row) => ({
    signatureId: row.id,
    role: row.signerCompanyId === contract.buyerCompanyId ? "buyer" : "seller",
    name: row.name,
    email: row.email,
    clientUserId: row.providerClientUserId || `ecoglobe-signature-${row.id}`,
    signatureStatusCode: row.signatureStatusCode,
  }));
}

async function sendEnvelope(
  request: IncomingMessage,
  response: ServerResponse,
  contractId: number,
) {
  const auth = await requireSessionAuth(request);
  const contract = await loadContract(contractId);
  requireContractAccess(auth, contract);
  if (contract.providerEnvelopeId) {
    throw new ApiError(409, "This contract already has a DocuSign envelope.");
  }
  if (!["draft", "signature_pending"].includes(contract.contractStatusCode)) {
    throw new ApiError(409, "Only a draft or signature-pending contract can be sent to DocuSign.");
  }
  const body = await readJsonBody<{ templateId?: string }>(request);
  const signers = await loadContractSigners(contract);
  const buyerSigners = signers.filter((signer) => signer.role === "buyer");
  const sellerSigners = signers.filter((signer) => signer.role === "seller");
  if (buyerSigners.length !== 1 || sellerSigners.length !== 1) {
    throw new ApiError(
      400,
      "The configured DocuSign template requires exactly one buyer and one seller signer.",
    );
  }
  const nonReadySigner = signers.find((signer) => signer.signatureStatusCode !== "not_sent");
  if (nonReadySigner) {
    throw new ApiError(409, "All signers must be in the not-sent state before creating an envelope.");
  }
  const envelope = await createDocusignEnvelope({
    contractId,
    title: contract.title,
    signers,
    templateId: getOptionalString(body, "templateId", 200),
  });
  await queryRowsWithParams(
    `UPDATE dbo.Contracts
       SET ProviderName = 'docusign', ProviderEnvelopeId = @envelopeId,
           ContractStatusId = (SELECT Id FROM dbo.ContractStatuses WHERE Code = 'signature_pending'),
           UpdatedByUserId = @userId, UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @contractId;
     UPDATE dbo.Signatures
       SET ProviderName = 'docusign', ProviderEnvelopeId = @envelopeId,
           ProviderClientUserId = CONCAT('ecoglobe-signature-', Id),
           SignatureStatusId = (SELECT Id FROM dbo.SignatureStatuses WHERE Code = 'sent'),
           SentAt = SYSUTCDATETIME(), UpdatedByUserId = @userId, UpdatedAt = SYSUTCDATETIME()
       WHERE ContractId = @contractId;`,
    [
      intParam("contractId", contractId),
      intParam("userId", auth.userId),
      varcharParam("envelopeId", envelope.envelopeId),
    ],
  );
  sendJson(response, 201, { ok: true, envelope });
}

async function createSigningView(
  request: IncomingMessage,
  response: ServerResponse,
  signatureId: number,
) {
  const auth = await requireSessionAuth(request);
  const signature = (
    await queryRowsWithParams<SignatureRow>(
      `SELECT s.Id AS id, s.ContractId AS contractId, s.SignerUserId AS signerUserId,
        s.SignerCompanyId AS signerCompanyId, u.Name AS name, u.Email AS email,
        s.ProviderClientUserId AS providerClientUserId,
        c.ProviderEnvelopeId AS providerEnvelopeId,
        c.BuyerCompanyId AS buyerCompanyId, c.SellerCompanyId AS sellerCompanyId,
        ss.Code AS signatureStatusCode
       FROM dbo.Signatures s
       INNER JOIN dbo.Users u ON u.Id = s.SignerUserId
       INNER JOIN dbo.Contracts c ON c.Id = s.ContractId
       INNER JOIN dbo.SignatureStatuses ss ON ss.Id = s.SignatureStatusId
       WHERE s.Id = @id;`,
      [intParam("id", signatureId)],
    )
  )[0];
  if (!signature) throw new ApiError(404, "Signature not found.");
  if (!auth.isAdmin && auth.userId !== signature.signerUserId) {
    throw new ApiError(403, "Only the assigned signer can open this signing session.");
  }
  if (!signature.providerEnvelopeId) {
    throw new ApiError(409, "The DocuSign envelope has not been sent.");
  }
  if (!["sent", "viewed"].includes(signature.signatureStatusCode)) {
    throw new ApiError(409, "This signature is not currently awaiting the signer.");
  }
  const body = await readJsonBody<{ returnUrl?: string }>(request);
  const result = await createDocusignRecipientView({
    envelopeId: signature.providerEnvelopeId,
    signer: {
      signatureId: signature.id,
      role: signature.signerCompanyId === signature.buyerCompanyId ? "buyer" : "seller",
      name: signature.name,
      email: signature.email,
      clientUserId: signature.providerClientUserId || `ecoglobe-signature-${signature.id}`,
    },
    returnUrl: getOptionalString(body, "returnUrl", 1000),
  });
  sendJson(response, 200, { ok: true, signingUrl: result.url, expiresInSeconds: 300 });
}

function normalizeSignatureStatus(value: unknown) {
  switch (String(value || "").toLowerCase()) {
    case "sent": return "sent";
    case "delivered": return "viewed";
    case "completed": return "signed";
    case "declined": return "declined";
    default: return undefined;
  }
}

async function reconcileEnvelope(envelopeId: string) {
  const [envelope, recipients] = await Promise.all([
    getDocusignEnvelope(envelopeId),
    getDocusignRecipients(envelopeId),
  ]);
  for (const recipient of recipients.signers ?? []) {
    const statusCode = normalizeSignatureStatus(recipient.status);
    const clientUserId = typeof recipient.clientUserId === "string" ? recipient.clientUserId : undefined;
    const recipientId = typeof recipient.recipientId === "string" ? recipient.recipientId : undefined;
    if (!statusCode || (!clientUserId && !recipientId)) continue;
    await queryRowsWithParams(
      `UPDATE dbo.Signatures SET
         ProviderRecipientId = COALESCE(@recipientId, ProviderRecipientId),
         SignatureStatusId = (SELECT Id FROM dbo.SignatureStatuses WHERE Code = @statusCode),
         DeliveredAt = CASE WHEN @statusCode IN ('viewed','signed') THEN COALESCE(DeliveredAt, SYSUTCDATETIME()) ELSE DeliveredAt END,
         SignedAt = CASE WHEN @statusCode = 'signed' THEN COALESCE(SignedAt, SYSUTCDATETIME()) ELSE SignedAt END,
         DeclinedAt = CASE WHEN @statusCode = 'declined' THEN COALESCE(DeclinedAt, SYSUTCDATETIME()) ELSE DeclinedAt END,
         UpdatedAt = SYSUTCDATETIME()
       WHERE ProviderEnvelopeId = @envelopeId
         AND ((@clientUserId IS NOT NULL AND ProviderClientUserId = @clientUserId)
           OR (@recipientId IS NOT NULL AND ProviderRecipientId = @recipientId));`,
      [
        varcharParam("envelopeId", envelopeId),
        varcharParam("clientUserId", clientUserId),
        varcharParam("recipientId", recipientId),
        varcharParam("statusCode", statusCode, 80),
      ],
    );
  }
  const envelopeStatus = String(envelope.status || "").toLowerCase();
  let archive: { signedDocumentUrl: string; certificateUrl: string } | undefined;
  if (envelopeStatus === "completed") archive = await archiveCompletedEnvelope(envelopeId);
  await queryRowsWithParams(
    `UPDATE dbo.Contracts SET
       ContractStatusId = CASE
         WHEN @envelopeStatus = 'completed' THEN (SELECT Id FROM dbo.ContractStatuses WHERE Code = 'active')
         WHEN @envelopeStatus = 'declined' THEN (SELECT Id FROM dbo.ContractStatuses WHERE Code = 'declined')
         WHEN @envelopeStatus = 'voided' THEN (SELECT Id FROM dbo.ContractStatuses WHERE Code = 'voided')
         ELSE ContractStatusId END,
       SignedDocumentUrl = COALESCE(@signedDocumentUrl, SignedDocumentUrl),
       CompletionCertificateUrl = COALESCE(@certificateUrl, CompletionCertificateUrl),
       CompletedAt = CASE WHEN @envelopeStatus = 'completed' THEN COALESCE(CompletedAt, SYSUTCDATETIME()) ELSE CompletedAt END,
       UpdatedAt = SYSUTCDATETIME()
     WHERE ProviderEnvelopeId = @envelopeId;`,
    [
      varcharParam("envelopeId", envelopeId),
      varcharParam("envelopeStatus", envelopeStatus, 80),
      nvarcharParam("signedDocumentUrl", archive?.signedDocumentUrl),
      nvarcharParam("certificateUrl", archive?.certificateUrl),
    ],
  );
  return { envelope, recipients, archive };
}

async function readRawBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

async function handleWebhook(request: IncomingMessage, response: ServerResponse) {
  const rawBody = await readRawBody(request);
  const secret = getDocusignConfig().webhookHmacSecret;
  const signatureHeader = request.headers["x-docusign-signature-1"];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!verifyDocusignHmac(rawBody, signature, secret)) {
    throw new ApiError(401, "Invalid DocuSign webhook signature.");
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "DocuSign webhook body must be valid JSON.");
  }
  const data = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
  const envelopeId = typeof data.envelopeId === "string" ? data.envelopeId : undefined;
  if (!envelopeId) throw new ApiError(400, "DocuSign webhook did not include an envelope ID.");
  const eventType = typeof payload.event === "string" ? payload.event : "unknown";
  const eventId = createHash("sha256").update(rawBody).digest("hex");
  const inserted = await queryRowsWithParams<{ id: number }>(
    `IF NOT EXISTS (SELECT 1 FROM dbo.SignatureWebhookEvents WHERE ProviderEventId = @eventId)
     BEGIN
       INSERT INTO dbo.SignatureWebhookEvents
         (ProviderName, ProviderEventId, ProviderEnvelopeId, EventType, PayloadHash, ProcessingStatus)
       OUTPUT INSERTED.Id AS id
       VALUES ('docusign', @eventId, @envelopeId, @eventType, @eventId, 'received');
     END;`,
    [
      varcharParam("eventId", eventId, 64),
      varcharParam("envelopeId", envelopeId),
      varcharParam("eventType", eventType, 120),
    ],
  );
  let eventRow = inserted[0];
  if (!eventRow) {
    const existing = (
      await queryRowsWithParams<{ id: number; processingStatus: string }>(
        `SELECT Id AS id, ProcessingStatus AS processingStatus
         FROM dbo.SignatureWebhookEvents WHERE ProviderEventId = @eventId;`,
        [varcharParam("eventId", eventId, 64)],
      )
    )[0];
    if (!existing || existing.processingStatus === "processed") {
      sendJson(response, 200, { ok: true, duplicate: true });
      return;
    }
    eventRow = existing;
  }
  try {
    await reconcileEnvelope(envelopeId);
    await queryRowsWithParams(
      `UPDATE dbo.SignatureWebhookEvents
       SET ProcessingStatus = 'processed', ProcessedAt = SYSUTCDATETIME()
       WHERE Id = @id;`,
      [intParam("id", eventRow.id)],
    );
  } catch (error) {
    await queryRowsWithParams(
      `UPDATE dbo.SignatureWebhookEvents
       SET ProcessingStatus = 'failed', ProcessingError = @error, ProcessedAt = SYSUTCDATETIME()
       WHERE Id = @id;`,
      [
        intParam("id", eventRow.id),
        nvarcharParam("error", error instanceof Error ? error.message : "Unknown webhook error", 2000),
      ],
    );
    throw error;
  }
  sendJson(response, 200, { ok: true });
}

export async function handleDocusignRoute(
  request: IncomingMessage,
  response: ServerResponse,
  requestUrl: URL,
) {
  if (requestUrl.pathname === "/api/docusign/webhook") {
    if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
    await handleWebhook(request, response);
    return true;
  }
  if (requestUrl.pathname === "/api/docusign/status") {
    if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
    const auth = await requireSessionAuth(request);
    if (!auth.isAdmin) throw new ApiError(403, "Administrator access is required.");
    sendJson(response, 200, { ok: true, docusign: getDocusignConfigurationStatus() });
    return true;
  }
  const envelopeMatch = matchPath(requestUrl.pathname, "/api/contracts/:id/docusign-envelope");
  if (envelopeMatch.matched) {
    if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
    await sendEnvelope(request, response, parseId(envelopeMatch.params.id, "Contract ID"));
    return true;
  }
  const signingViewMatch = matchPath(requestUrl.pathname, "/api/signatures/:id/docusign-view");
  if (signingViewMatch.matched) {
    if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
    await createSigningView(request, response, parseId(signingViewMatch.params.id, "Signature ID"));
    return true;
  }
  const syncMatch = matchPath(requestUrl.pathname, "/api/docusign/envelopes/:id/sync");
  if (syncMatch.matched) {
    if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
    const auth = await requireSessionAuth(request);
    const contract = (
      await queryRowsWithParams<ContractRow>(
        `SELECT c.Id AS id, c.Title AS title, c.BuyerCompanyId AS buyerCompanyId,
          c.SellerCompanyId AS sellerCompanyId, c.ProviderEnvelopeId AS providerEnvelopeId,
          cs.Code AS contractStatusCode
         FROM dbo.Contracts c
         INNER JOIN dbo.ContractStatuses cs ON cs.Id = c.ContractStatusId
         WHERE c.ProviderEnvelopeId = @envelopeId;`,
        [varcharParam("envelopeId", syncMatch.params.id)],
      )
    )[0];
    if (!contract) throw new ApiError(404, "DocuSign envelope not found.");
    requireContractAccess(auth, contract);
    const result = await reconcileEnvelope(syncMatch.params.id as string);
    sendJson(response, 200, { ok: true, result });
    return true;
  }
  const documentMatch = matchPath(
    requestUrl.pathname,
    "/api/contracts/:id/docusign-documents/:kind",
  );
  if (documentMatch.matched) {
    if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
    const auth = await requireSessionAuth(request);
    const contractId = parseId(documentMatch.params.id, "Contract ID");
    const contract = await loadContract(contractId);
    requireContractAccess(auth, contract);
    const kind = documentMatch.params.kind;
    if (kind !== "agreement" && kind !== "certificate") {
      throw new ApiError(404, "Archived document not found.");
    }
    const row = (
      await queryRowsWithParams<{ documentUrl?: string }>(
        `SELECT ${kind === "agreement" ? "SignedDocumentUrl" : "CompletionCertificateUrl"} AS documentUrl
         FROM dbo.Contracts WHERE Id = @id;`,
        [intParam("id", contractId)],
      )
    )[0];
    if (!row?.documentUrl) throw new ApiError(404, "Archived document not found.");
    const document = await readArchivedDocusignDocument(row.documentUrl);
    response.writeHead(200, {
      ...corsHeaders(),
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="contract-${contractId}-${kind}.pdf"`,
      "cache-control": "private, no-store",
    });
    response.end(document);
    return true;
  }
  return false;
}
