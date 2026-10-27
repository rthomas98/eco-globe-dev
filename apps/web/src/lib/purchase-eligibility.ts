/**
 * Why a listing cannot be bought online right now, mirroring the backend
 * checkout rules (checkout-routes.ts `requireBuyer` / `startCheckout`,
 * listing-safety.ts `requireListingSds`) so buyers learn the reason before
 * checkout instead of from a rejected order. `null` means it may proceed.
 */

export type PurchaseBlock =
  | "sign-in"
  | "not-buyer"
  | "no-permission"
  | "own-listing"
  | "no-price"
  | "currency"
  | "no-sds"
  | "exceeds-stock"
  | "below-minimum";

/** The viewer's membership in their active company, as the session reports it. */
export interface PurchaseMembership {
  companyTypeCode: string;
  memberRoleCode: string;
  canExecuteTransactions: boolean;
}

export interface PurchaseContext {
  signedIn: boolean;
  /** Active-company membership; null when the session has no membership details. */
  membership: PurchaseMembership | null;
  /** Fallback for sessions without membership details. */
  roles: readonly string[];
  /** The listing belongs to the viewer's active company. */
  ownListing: boolean;
  unitPrice: number | null;
  currencyCode: string;
  hasSds: boolean;
  /** Quantity the order line would have (selected, plus what is already in the cart). */
  quantity: number;
  /** Seller's recorded available quantity, or null when unknown. */
  available: number | null;
}

/** Online checkout currently charges USD only (backend checkout rule). */
const CHECKOUT_CURRENCY = "USD";
/** Backend rejects checkout totals below USD 0.50 (Stripe minimum). */
const MINIMUM_TOTAL_CENTS = 50;

/** The membership for `activeCompanyId`, or null when it is not in the session. */
export function activeMembership<T extends PurchaseMembership & { id: number }>(
  companies: readonly T[] | undefined,
  activeCompanyId: number | undefined,
): T | null {
  return companies?.find((company) => company.id === activeCompanyId) ?? null;
}

function canBuy(context: PurchaseContext): "not-buyer" | "no-permission" | null {
  const membership = context.membership;
  if (!membership) return context.roles.includes("buyer") ? null : "not-buyer";
  if (!["buyer", "both"].includes(membership.companyTypeCode)) return "not-buyer";
  if (!["owner", "admin"].includes(membership.memberRoleCode) && !membership.canExecuteTransactions) return "no-permission";
  return null;
}

export function purchaseBlock(context: PurchaseContext): PurchaseBlock | null {
  if (!context.signedIn) return "sign-in";
  const buyer = canBuy(context);
  if (buyer) return buyer;
  if (context.ownListing) return "own-listing";
  if (context.unitPrice === null) return "no-price";
  if (context.currencyCode.toUpperCase() !== CHECKOUT_CURRENCY) return "currency";
  if (!context.hasSds) return "no-sds";
  if (context.available !== null && context.quantity > context.available) return "exceeds-stock";
  if (Math.round(context.quantity * context.unitPrice * 100) < MINIMUM_TOTAL_CENTS) return "below-minimum";
  return null;
}

/** Short buyer-facing explanation; null for blocks the product pages explain themselves. */
export function purchaseBlockMessage(block: PurchaseBlock | null): string | null {
  switch (block) {
    case "not-buyer":
      return "Purchasing needs a buyer company. Switch to your buyer company or add buyer access to check out.";
    case "no-permission":
      return "Your role in this company can't place orders. Ask a company owner or admin for purchase permission.";
    case "own-listing":
      return "This is your company's listing, so it can't be purchased from this account.";
    case "currency":
      return "Online checkout supports USD listings only. Request a quote from the seller.";
    case "below-minimum":
      return "Online checkout needs an order total of at least $0.50. Increase the quantity or request a quote.";
    default:
      return null;
  }
}
