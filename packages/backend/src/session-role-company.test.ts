import assert from "node:assert/strict";
import test from "node:test";
import type { SessionUser } from "./auth.js";
import { selectSessionRoleCompany } from "./session-role-company.js";

function membership(id: number, companyTypeCode: string): SessionUser["companies"][number] {
  return {
    id,
    companyTypeCode,
    legalName: `Company ${id}`,
    memberRoleCode: "viewer",
    permissionTierCode: "view_only",
    canApproveTransactions: false,
    canExecuteTransactions: false,
  };
}

for (const role of ["buyer", "seller"] as const) {
  test(`${role}: prefers eligible current company over an earlier eligible membership`, () => {
    const first = membership(1, role);
    const current = membership(2, role);
    assert.equal(selectSessionRoleCompany({ activeCompanyId: 2, companies: [first, current] }, role), current);
  });

  test(`${role}: retains current both-type company and its read-only permissions`, () => {
    const first = membership(1, role);
    const current = membership(2, "both");
    assert.equal(selectSessionRoleCompany({ activeCompanyId: 2, companies: [first, current] }, role), current);
    assert.equal(current.canExecuteTransactions, false);
    assert.equal(current.permissionTierCode, "view_only");
  });

  test(`${role}: incompatible current company falls back to the first eligible membership`, () => {
    const current = membership(1, role === "buyer" ? "seller" : "buyer");
    const firstEligible = membership(2, "both");
    assert.equal(selectSessionRoleCompany({ activeCompanyId: 1, companies: [current, firstEligible, membership(3, role)] }, role), firstEligible);
  });

  test(`${role}: absent or non-member current company falls back without adopting its ID`, () => {
    const first = membership(1, role);
    for (const activeCompanyId of [undefined, 99]) {
      assert.equal(selectSessionRoleCompany({ activeCompanyId, companies: [first, membership(2, "both")] }, role), first);
    }
  });

  test(`${role}: no eligible active membership returns no company`, () => {
    for (const companies of [[], [membership(1, "unknown")], [membership(1, role === "buyer" ? "seller" : "buyer")]]) {
      assert.equal(selectSessionRoleCompany({ activeCompanyId: 1, companies }, role), undefined);
    }
  });
}
