/**
 * Display helpers for buyer requests (wanted listings), including private
 * drafts with missing values. Import-free for node:test. Absent values are
 * described as not specified, never shown as zero.
 */
export type WantedStatus = "draft" | "open" | "closed";

export interface WantedDisplayInput {
  statusCode?: string | null;
  isOpen: boolean;
  quantity: number | null;
  quantityUnit: string | null;
  targetPricePerUnit: number | null;
  currencyCode: string | null;
  countryCode: string | null;
  stateProvince: string | null;
  needByDate?: string | null;
}

export const NOT_SPECIFIED = "Not specified";

/** Server status, falling back to the legacy isOpen flag. */
export function wantedStatus(w: Pick<WantedDisplayInput, "statusCode" | "isOpen">): WantedStatus {
  if (w.statusCode === "draft" || w.statusCode === "open" || w.statusCode === "closed") return w.statusCode;
  return w.isOpen ? "open" : "closed";
}

/** True only for open requests sellers may respond to; drafts never qualify. */
export function isRespondable(w: Pick<WantedDisplayInput, "statusCode" | "isOpen">) {
  return w.isOpen && wantedStatus(w) === "open";
}

export function describeWantedQuantity(w: Pick<WantedDisplayInput, "quantity" | "quantityUnit">) {
  if (w.quantity === null || w.quantity === undefined || !Number.isFinite(w.quantity)) {
    return "Volume not specified";
  }
  return `${w.quantity} ${w.quantityUnit?.trim() || "(unit not specified)"}`;
}

export function describeWantedTargetPrice(
  w: Pick<WantedDisplayInput, "targetPricePerUnit" | "currencyCode" | "quantityUnit">,
) {
  if (w.targetPricePerUnit === null || w.targetPricePerUnit === undefined) return NOT_SPECIFIED;
  const currency = w.currencyCode?.trim() || "(currency not specified)";
  const unit = w.quantityUnit?.trim() || "unit not specified";
  return `${currency} ${w.targetPricePerUnit} / ${unit}`;
}

export function describeWantedRegion(w: Pick<WantedDisplayInput, "stateProvince" | "countryCode">) {
  return [w.stateProvince, w.countryCode].map((part) => part?.trim()).filter(Boolean).join(", ") || NOT_SPECIFIED;
}

export function describeNeedBy(w: Pick<WantedDisplayInput, "needByDate">) {
  const value = w.needByDate?.trim();
  return value ? value.slice(0, 10) : NOT_SPECIFIED;
}

interface MembershipLike {
  id: number;
  memberRoleCode: string;
  permissionTierCode: string;
  canExecuteTransactions?: boolean;
}

const REQUEST_TIERS = ["requester", "approver", "executor"];

/** Same rule as the API: owners/admins, or non-viewer members with a requesting tier or execute rights. */
export function canWriteRequests(membership: MembershipLike) {
  if (membership.memberRoleCode === "owner" || membership.memberRoleCode === "admin") return true;
  if (membership.memberRoleCode === "viewer" || membership.permissionTierCode === "view_only") return false;
  return REQUEST_TIERS.includes(membership.permissionTierCode) || membership.canExecuteTransactions === true;
}

/**
 * True when the active company membership may not create, save or publish
 * requests, so those actions are hidden. The API enforces the same rule; an
 * unknown membership is not hidden here.
 */
export function isViewOnlyMember(user: { activeCompanyId?: number; companies?: MembershipLike[] } | null) {
  const membership = user?.companies?.find((c) => c.id === user.activeCompanyId);
  if (!membership) return false;
  return !canWriteRequests(membership);
}
