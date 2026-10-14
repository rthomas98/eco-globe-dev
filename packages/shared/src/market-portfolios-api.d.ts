/** Internal groups do not grant access to records, listings, or documents. */
export interface MarketPortfolio {
  id: number;
  version: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  recordIds: number[];
  listingIds: number[];
  companyIds: number[];
  createdAt: string;
  updatedAt: string;
}
export interface MarketPortfolioWrite {
  name: string;
  description: string | null;
  recordIds: number[];
  listingIds: number[];
  companyIds: number[];
  reason: string;
}
export interface MarketPortfolioUpdate extends MarketPortfolioWrite {
  expectedVersion: string;
}
export interface MarketPortfolioTransition {
  expectedVersion: string;
  reason: string;
}
export interface AssignedMarketPortfolio {
  id: number;
  name: string;
}
export interface MarketPortfolioAuditEvent {
  id: number;
  action: string;
  actorUserId: number;
  actorUserName: string | null;
  createdAt: string;
  reason: string;
}
export interface MarketPortfolioList {
  ok: true;
  portfolios: MarketPortfolio[];
}
export interface MarketPortfolioResult {
  ok: true;
  portfolio: MarketPortfolio;
}
export interface AssignedMarketPortfolioList {
  ok: true;
  portfolios: AssignedMarketPortfolio[];
}
export interface MarketPortfolioAuditList {
  ok: true;
  events: MarketPortfolioAuditEvent[];
}
