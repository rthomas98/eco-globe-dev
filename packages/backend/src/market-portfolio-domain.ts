import type { MarketPortfolioWrite } from "../../shared/src/market-portfolios-api.js";
import {
  object,
  keys,
  text,
  invalid,
  version,
} from "./market-record-domain.js";

export function portfolioId(value: unknown): number {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d{0,9}$/u.test(value) ||
    Number(value) > 2147483647
  )
    invalid(
      "portfolioId",
      "Portfolio ID must be a positive SQL INT in decimal notation.",
    );
  return Number(value);
}
export function portfolioIds(value: unknown, field: string): number[] {
  if (
    !Array.isArray(value) ||
    value.length > 500 ||
    value.some((id) => !Number.isInteger(id) || id <= 0 || id > 2147483647) ||
    new Set(value).size !== value.length
  )
    invalid(
      field,
      `${field} must contain at most 500 unique positive SQL INT IDs.`,
    );
  return [...value].sort((a: number, b: number) => a - b);
}
export function portfolioInput(
  input: unknown,
  update = false,
): MarketPortfolioWrite & { expectedVersion?: string } {
  const body = object(input);
  keys(body, [
    "name",
    "description",
    "recordIds",
    "listingIds",
    "companyIds",
    "reason",
    ...(update ? ["expectedVersion"] : []),
  ]);
  return {
    name: text(body.name, "name", 120, true)!,
    description: text(body.description, "description", 2000),
    recordIds: portfolioIds(body.recordIds, "recordIds"),
    listingIds: portfolioIds(body.listingIds, "listingIds"),
    companyIds: portfolioIds(body.companyIds, "companyIds"),
    reason: text(body.reason, "reason", 1000, true)!,
    ...(update ? { expectedVersion: version(body.expectedVersion) } : {}),
  };
}
export function portfolioTransition(input: unknown) {
  const body = object(input);
  keys(body, ["expectedVersion", "reason"]);
  return {
    expectedVersion: version(body.expectedVersion),
    reason: text(body.reason, "reason", 1000, true)!,
  };
}
