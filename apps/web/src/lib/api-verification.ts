"use client";

import { apiFetch, BackendApiError } from "./backend-client";
import { MAX_DOCUMENT_BYTES, readFileAsBase64 } from "./listings-api";

/** Company verification evidence (KYC). All state comes from the backend. */

export interface VerificationEvidence {
  id: number;
  evidenceType: string;
  fileName: string;
  status: "pending_review" | "approved" | "rejected" | string;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface CompanyVerification {
  companyId: number;
  verificationStatusCode: string;
  verificationStatusName?: string;
  evidence: VerificationEvidence[];
}

export async function fetchCompanyVerification(companyId: number) {
  const body = await apiFetch<{ ok: true; verification: CompanyVerification }>(
    `/api/companies/${companyId}/verification`,
  );
  return body.verification;
}

export async function uploadVerificationEvidence(companyId: number, evidenceType: string, file: File) {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new BackendApiError(
      `${file.name} is larger than 5 MB. Please upload a smaller file.`,
      413,
      "validation",
    );
  }
  const contentBase64 = await readFileAsBase64(file);
  const body = await apiFetch<{ ok: true; evidence: VerificationEvidence }>(
    `/api/companies/${companyId}/verification`,
    {
      method: "POST",
      deadlineMs: 60_000,
      body: JSON.stringify({
        evidenceType,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        contentBase64,
      }),
    },
  );
  return body.evidence;
}

export function isVerificationApiUnavailable(error: unknown) {
  return error instanceof BackendApiError && (error.status === 404 || error.status === 405 || error.status === 501);
}

/* ── Admin review ── */

export interface VerificationQueueRow {
  companyId: number;
  companyName: string;
  status: string;
  documentCount: number;
  submittedAt: string | null;
}

export type VerificationDecision = "approved" | "rejected" | "needs_information";

export async function fetchVerificationQueue() {
  const body = await apiFetch<{ ok: true; verifications: VerificationQueueRow[] }>(
    "/api/admin/verifications",
  );
  return Array.isArray(body.verifications) ? body.verifications : [];
}

/** Records an admin decision. Approval is refused (409) without evidence. */
export async function decideVerification(companyId: number, decision: VerificationDecision, note: string) {
  return apiFetch<{ ok: true; companyId: number; decision: string; status: string }>(
    `/api/admin/verifications/${companyId}`,
    { method: "PATCH", body: JSON.stringify({ decision, note }) },
  );
}
