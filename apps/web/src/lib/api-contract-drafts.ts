"use client";

import type { BackendContract } from "./docusign-client";

async function request<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    ...(body
      ? {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "Could not save the agreement.");
  return result as T;
}

export async function fetchContractDrafts() {
  return (await request<{ contracts: BackendContract[] }>("/api/contracts"))
    .contracts;
}

export async function saveContractDraft(input: {
  buyerCompanyId: number;
  sellerCompanyId: number;
  listingId?: number;
  title: string;
  renewalTerms?: string;
}) {
  return (
    await request<{ contract: { id: number } }>("/api/contracts", {
      ...input,
      contractStatusCode: "draft",
      contractSourceCode: input.listingId
        ? "platform_listing"
        : "custom_off_platform",
    })
  ).contract;
}
