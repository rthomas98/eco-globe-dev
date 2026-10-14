// Pure helpers for demo portfolio forms and the buyer portfolio selector.
// Kept free of React/DOM imports so node:test can load them directly.

export const PORTFOLIO_LIMITS = {
  nameMax: 120,
  descriptionMax: 2000,
  reasonMax: 1000,
  idsMax: 500,
} as const;

export type PortfolioMemberKind = "recordIds" | "listingIds" | "companyIds";

export interface PortfolioDraft {
  name: string;
  description: string;
  recordIds: number[];
  listingIds: number[];
  companyIds: number[];
  reason: string;
}

export type PortfolioDraftErrors = Partial<Record<keyof PortfolioDraft, string>>;

function isPositiveId(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * Parse IDs typed or pasted as text ("12, 15 18"). Only whole positive
 * numbers are accepted; anything else is reported back, never guessed.
 */
export function parseIdList(text: string): { ids: number[]; invalid: string[] } {
  const ids: number[] = [];
  const invalid: string[] = [];
  for (const token of text.split(/[\s,;]+/)) {
    if (!token) continue;
    const cleaned = token.replace(/^#/, "");
    const value = /^\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
    if (!isPositiveId(value)) invalid.push(token);
    else if (!ids.includes(value)) ids.push(value);
  }
  return { ids, invalid };
}

export function mergeIds(current: number[], added: number[]): number[] {
  const next = [...current];
  for (const id of added) if (isPositiveId(id) && !next.includes(id)) next.push(id);
  return next;
}

export function validatePortfolioDraft(draft: PortfolioDraft): PortfolioDraftErrors {
  const errors: PortfolioDraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Enter a portfolio name.";
  else if (name.length > PORTFOLIO_LIMITS.nameMax)
    errors.name = `Use ${PORTFOLIO_LIMITS.nameMax} characters or fewer.`;
  if (draft.description.trim().length > PORTFOLIO_LIMITS.descriptionMax)
    errors.description = `Use ${PORTFOLIO_LIMITS.descriptionMax} characters or fewer.`;
  for (const key of ["recordIds", "listingIds", "companyIds"] as const) {
    const ids = draft[key];
    if (ids.length > PORTFOLIO_LIMITS.idsMax)
      errors[key] = `Add at most ${PORTFOLIO_LIMITS.idsMax} IDs.`;
    else if (ids.some((id) => !isPositiveId(id)) || new Set(ids).size !== ids.length)
      errors[key] = "IDs must be unique whole positive numbers.";
  }
  const reason = draft.reason.trim();
  if (!reason) errors.reason = "Enter a reason so the audit history explains this change.";
  else if (reason.length > PORTFOLIO_LIMITS.reasonMax)
    errors.reason = `Use ${PORTFOLIO_LIMITS.reasonMax} characters or fewer.`;
  return errors;
}

/** Request body with only the contract's known fields. */
export function toPortfolioWrite(draft: PortfolioDraft) {
  const description = draft.description.trim();
  return {
    name: draft.name.trim(),
    description: description ? description : null,
    recordIds: [...draft.recordIds],
    listingIds: [...draft.listingIds],
    companyIds: [...draft.companyIds],
    reason: draft.reason.trim(),
  };
}

/**
 * Lookup eligibility mirrors the server's membership rules: published
 * listings from sellers that are not inactive, and companies that are not
 * inactive or suspended. The server still validates every saved ID.
 */
export function isEligiblePortfolioListing(listing: {
  listingStatusCode: string;
  sellerVerificationStatusCode?: string | null;
  teaser?: boolean;
}): boolean {
  return (
    listing.listingStatusCode === "published" &&
    listing.sellerVerificationStatusCode !== "inactive"
  );
}

export function isEligiblePortfolioCompany(company: { verificationStatusCode: string }): boolean {
  return company.verificationStatusCode !== "inactive" && company.verificationStatusCode !== "suspended";
}

export type PortfolioParam =
  | { kind: "none" }
  | { kind: "valid"; id: number }
  | { kind: "invalid"; raw: string };

export const PORTFOLIO_PARAM = "portfolioId";
/** Portfolio IDs are SQL INT identities. */
export const SQL_INT_MAX = 2_147_483_647;

/**
 * Read `?portfolioId=` from a URL. Only an absent parameter means "no group";
 * a present but blank, non-canonical ("01", "+1", " 1") or out-of-range value
 * is invalid, so it can never widen to the full catalogue.
 */
export function parsePortfolioParam(value: string | null): PortfolioParam {
  if (value === null) return { kind: "none" };
  if (!/^[1-9]\d{0,9}$/.test(value)) return { kind: "invalid", raw: value };
  const id = Number(value);
  return id <= SQL_INT_MAX ? { kind: "valid", id } : { kind: "invalid", raw: value };
}

/** Change only the portfolio parameter; every other filter stays in the URL. */
export function withPortfolioParam(search: string, id: number | null): string {
  const params = new URLSearchParams(search);
  if (id === null) params.delete(PORTFOLIO_PARAM);
  else params.set(PORTFOLIO_PARAM, String(id));
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * After the active company changes, a selected group the new company is not
 * assigned to is cleared. An explicit link on first load is left for the
 * server to accept or refuse.
 */
export function shouldClearPortfolioAfterCompanyChange(input: {
  companyChanged: boolean;
  selected: PortfolioParam;
  assignedIds: number[] | null;
}): boolean {
  if (!input.companyChanged || input.assignedIds === null) return false;
  if (input.selected.kind === "none") return false;
  if (input.selected.kind === "invalid") return true;
  return !input.assignedIds.includes(input.selected.id);
}
