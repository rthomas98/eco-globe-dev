"use client";

import { apiFetch } from "./backend-client";

export interface ContactInquiryInput {
  name: string;
  email: string;
  company?: string;
  topic?: string;
  message: string;
}

/**
 * Stores a public contact inquiry on the backend. Resolves only when the
 * backend accepted and saved it; any failure throws.
 */
export async function submitContactInquiry(input: ContactInquiryInput) {
  return apiFetch<{ ok: true; id?: number; deliveryStatus?: string }>("/api/contact", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface ContactRequest {
  id: number;
  name: string;
  email: string;
  company: string | null;
  topic: string;
  message: string;
  createdAt: string;
}

/** Admin: persisted public contact requests, newest first. */
export async function fetchContactRequests() {
  const body = await apiFetch<{ ok: true; requests: ContactRequest[] }>("/api/admin/contact-requests");
  return Array.isArray(body.requests) ? body.requests : [];
}
