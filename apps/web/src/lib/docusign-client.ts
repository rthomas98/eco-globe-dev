"use client";

export type BackendContract = {
  id: number;
  buyerCompanyId: number;
  buyerCompanyName: string;
  sellerCompanyId: number;
  sellerCompanyName: string;
  title: string;
  contractStatusCode: string;
  providerName?: string;
  providerEnvelopeId?: string;
  signedDocumentUrl?: string;
  completionCertificateUrl?: string;
  completedAt?: string;
};

export type BackendSignature = {
  id: number;
  contractId: number;
  signerUserId: number;
  signerUserName: string;
  signerCompanyId: number;
  signerCompanyName: string;
  providerName?: string;
  providerEnvelopeId?: string;
  providerRecipientId?: string;
  signatureStatusCode: string;
  sentAt?: string;
  deliveredAt?: string;
  signedAt?: string;
  declinedAt?: string;
};

async function backendJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "EcoGlobe could not complete the DocuSign request.");
  return payload;
}

export async function loadSignatureWorkspace() {
  const [contractResult, signatureResult] = await Promise.all([
    backendJson<{ ok: true; contracts: BackendContract[] }>("/api/contracts"),
    backendJson<{ ok: true; signatures: BackendSignature[] }>("/api/signatures"),
  ]);
  return { contracts: contractResult.contracts, signatures: signatureResult.signatures };
}

export async function sendContractForDocusign(contractId: number) {
  return backendJson<{ ok: true; envelope: { envelopeId: string; status: string } }>(
    `/api/contracts/${contractId}/docusign-envelope`,
    { method: "POST", body: "{}" },
  );
}

export async function createDocusignSigningView(signatureId: number, returnUrl: string) {
  return backendJson<{ ok: true; signingUrl: string; expiresInSeconds: number }>(
    `/api/signatures/${signatureId}/docusign-view`,
    { method: "POST", body: JSON.stringify({ returnUrl }) },
  );
}
