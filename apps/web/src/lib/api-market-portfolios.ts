"use client";

import type {
  AssignedMarketPortfolio,
  AssignedMarketPortfolioList,
  MarketPortfolio,
  MarketPortfolioAuditList,
  MarketPortfolioList,
  MarketPortfolioResult,
  MarketPortfolioWrite,
} from "@eco-globe/shared/market-portfolios-api";
import { apiFetch } from "./backend-client";

/*
 * Demo portfolios group existing records, published listings and companies.
 * Groups never grant access: the server still applies listing visibility and
 * checks the company's assignment before filtering. Wire types are owned by
 * the backend in @eco-globe/shared/market-portfolios-api.
 *
 * The admin calls below are only for components/admin/market-portfolios; the
 * buyer catalogue uses `fetchAssignedPortfolios` alone.
 */

export type {
  AssignedMarketPortfolio,
  MarketPortfolio,
  MarketPortfolioAuditEvent,
  MarketPortfolioWrite,
} from "@eco-globe/shared/market-portfolios-api";

export type MarketPortfolioStatusFilter = "active" | "archived" | "all";

const ADMIN_BASE = "/api/admin/market-portfolios";

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/** SQL can return null for an empty membership list; the UI always gets []. */
function normalize(portfolio: MarketPortfolio): MarketPortfolio {
  return {
    ...portfolio,
    recordIds: asArray(portfolio.recordIds),
    listingIds: asArray(portfolio.listingIds),
    companyIds: asArray(portfolio.companyIds),
  };
}

export async function fetchMarketPortfolios(
  params: { status?: MarketPortfolioStatusFilter; search?: string } = {},
) {
  const query = new URLSearchParams();
  query.set("status", params.status ?? "active");
  if (params.search) query.set("search", params.search);
  const body = await apiFetch<MarketPortfolioList>(`${ADMIN_BASE}?${query}`);
  return asArray(body?.portfolios).map(normalize);
}

export async function fetchMarketPortfolio(id: number) {
  const body = await apiFetch<MarketPortfolioResult>(`${ADMIN_BASE}/${id}`);
  return normalize(body.portfolio);
}

export async function fetchMarketPortfolioAudit(id: number) {
  const body = await apiFetch<MarketPortfolioAuditList>(`${ADMIN_BASE}/${id}/audit`);
  return asArray(body?.events);
}

export async function createMarketPortfolio(input: MarketPortfolioWrite) {
  const body = await apiFetch<MarketPortfolioResult>(ADMIN_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalize(body.portfolio);
}

/** Full membership replacement guarded by the version the admin last saw. */
export async function updateMarketPortfolio(
  id: number,
  expectedVersion: string,
  input: MarketPortfolioWrite,
) {
  const body = await apiFetch<MarketPortfolioResult>(`${ADMIN_BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ expectedVersion, ...input }),
  });
  return normalize(body.portfolio);
}

export async function archiveMarketPortfolio(id: number, expectedVersion: string, reason: string) {
  const body = await apiFetch<MarketPortfolioResult>(`${ADMIN_BASE}/${id}/archive`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion, reason }),
  });
  return normalize(body.portfolio);
}

export async function restoreMarketPortfolio(id: number, expectedVersion: string, reason: string) {
  const body = await apiFetch<MarketPortfolioResult>(`${ADMIN_BASE}/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion, reason }),
  });
  return normalize(body.portfolio);
}

/** Active demo portfolios assigned to the signed-in company (names only). */
export async function fetchAssignedPortfolios(): Promise<AssignedMarketPortfolio[]> {
  const body = await apiFetch<AssignedMarketPortfolioList>("/api/market-portfolios/assigned");
  return asArray(body?.portfolios).filter(
    (item) => Number.isSafeInteger(item?.id) && item.id > 0 && typeof item.name === "string",
  );
}
