import { ApiError, type AuthContext } from "./http.js";

export function requireAssignedSigner(auth: AuthContext, signerUserId: number) {
  if (auth.userId !== signerUserId)
    throw new ApiError(
      403,
      "Only the assigned signer can open this signing session.",
    );
}

export function rejectSignatureEvidence(body: Record<string, unknown>) {
  if (
    (body.signatureStatusCode !== undefined &&
      body.signatureStatusCode !== "not_sent") ||
    ["signedAt", "signedDocumentUrl", "providerSignatureId"].some(
      (key) => body[key] !== undefined,
    )
  ) {
    throw new ApiError(
      400,
      "Signature evidence and status are managed only by DocuSign.",
    );
  }
}

export function rejectContractEvidence(body: Record<string, unknown>) {
  if (
    (body.contractStatusCode !== undefined &&
      body.contractStatusCode !== "draft") ||
    body.signedDocumentUrl !== undefined
  ) {
    throw new ApiError(
      400,
      "Contract signing status and documents are managed only by DocuSign.",
    );
  }
}

export function signingReturnUrl(
  requested: string | undefined,
  configured: string,
) {
  let target: URL;
  let allowed: URL;
  try {
    target = new URL(requested || configured);
    allowed = new URL(configured);
  } catch {
    throw new ApiError(400, "Invalid signing return URL.");
  }
  if (
    target.origin !== allowed.origin ||
    target.username ||
    target.password ||
    !["/buyer/e-signatures", "/seller/e-signatures"].includes(target.pathname)
  ) {
    throw new ApiError(
      400,
      "Signing must return to an EcoGlobe signature workspace.",
    );
  }
  return target.toString();
}
