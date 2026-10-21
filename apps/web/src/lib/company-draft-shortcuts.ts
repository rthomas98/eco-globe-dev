/**
 * Browse shortcuts to the active company's private drafts.
 *
 * Eligibility comes only from the active company membership and the roles the
 * account actually holds; an unknown membership offers nothing. `?status=draft`
 * is a presentation filter on screens the backend already scopes to the active
 * company — it never grants access.
 */

import type { DemoUser } from "./demo-user";

export const DRAFT_STATUS_PARAM = "status";
export const DRAFT_STATUS_VALUE = "draft";
export const BUYER_DRAFTS_HREF = "/buyer/rfq?status=draft";
export const SELLER_DRAFTS_HREF = "/seller/listings?status=draft";

export interface CompanyDraftShortcuts {
  companyId: number;
  companyName: string;
  buyer: boolean;
  seller: boolean;
}

type ShortcutUser = Pick<DemoUser, "activeCompanyId" | "companies" | "role" | "roles">;

function holdsRole(user: ShortcutUser, role: "buyer" | "seller") {
  const roles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  return roles.includes(role);
}

/** Draft shortcuts for the active company, or null when none apply. */
export function companyDraftShortcuts(user: ShortcutUser | null): CompanyDraftShortcuts | null {
  if (!user || typeof user.activeCompanyId !== "number") return null;
  const membership = user.companies?.find((c) => c.id === user.activeCompanyId);
  if (!membership) return null;
  const type = membership.companyTypeCode;
  const buyer = (type === "buyer" || type === "both") && holdsRole(user, "buyer");
  const seller = (type === "seller" || type === "both") && holdsRole(user, "seller");
  if (!buyer && !seller) return null;
  return { companyId: membership.id, companyName: membership.legalName, buyer, seller };
}

/** True only for the explicit `?status=draft` filter. */
export function isDraftStatusParam(value: string | null | undefined): boolean {
  return value === DRAFT_STATUS_VALUE;
}

/** Seller listings saved as drafts; other statuses, including closed, are left out. */
export function draftListingsOnly<T extends { statusCode: string }>(listings: T[]): T[] {
  return listings.filter((l) => l.statusCode === "draft");
}

/** Query string (with leading "?" when non-empty) toggling the draft filter. */
export function withDraftStatusParam(search: string, draftOnly: boolean): string {
  const params = new URLSearchParams(search);
  if (draftOnly) params.set(DRAFT_STATUS_PARAM, DRAFT_STATUS_VALUE);
  else params.delete(DRAFT_STATUS_PARAM);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export type DraftShortcutRole = "buyer" | "seller";

export const DRAFT_SHORTCUT_HREF: Record<DraftShortcutRole, string> = {
  buyer: BUYER_DRAFTS_HREF,
  seller: SELLER_DRAFTS_HREF,
};

/** A plain link is safe only when the session already acts in the target role. */
export function needsRoleSwitch(currentRole: string | undefined, target: DraftShortcutRole): boolean {
  return currentRole !== target;
}

/**
 * The raw server session must still be the same company, now acting in the
 * target role. Checked before any client session state is written.
 */
export function isRoleSwitchVerified(
  expectedCompanyId: number,
  target: DraftShortcutRole,
  session: { activeCompanyId?: number; activeRoleCode?: string } | null | undefined,
): boolean {
  return session?.activeCompanyId === expectedCompanyId && session.activeRoleCode === target;
}

export const ROLE_SWITCH_COMPANY_CHANGED =
  "Your workspace opened for a different company or role, so the drafts were not shown. Check the active company in your account menu and try again.";
