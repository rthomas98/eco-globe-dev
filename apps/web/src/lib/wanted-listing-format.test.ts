import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canWriteRequests,
  describeNeedBy,
  describeWantedQuantity,
  describeWantedRegion,
  describeWantedTargetPrice,
  isRespondable,
  isViewOnlyMember,
  wantedStatus,
} from "./wanted-listing-format.ts";

test("request write access follows the API membership rule", () => {
  const m = (memberRoleCode: string, permissionTierCode: string, canExecuteTransactions = false) => ({
    id: 1,
    memberRoleCode,
    permissionTierCode,
    canExecuteTransactions,
  });
  // Requesters keep RFQ authority, as do approver/executor tiers.
  assert.equal(canWriteRequests(m("buyer_operator", "requester")), true);
  assert.equal(canWriteRequests(m("member", "approver")), true);
  assert.equal(canWriteRequests(m("member", "executor")), true);
  // The execute flag alone allows writing for a non-viewer.
  assert.equal(canWriteRequests(m("member", "other_tier", true)), true);
  assert.equal(canWriteRequests(m("member", "other_tier")), false);
  // Viewers and view-only tiers are denied, even with the execute flag.
  assert.equal(canWriteRequests(m("viewer", "view_only")), false);
  assert.equal(canWriteRequests(m("viewer", "requester", true)), false);
  assert.equal(canWriteRequests(m("member", "view_only", true)), false);
  // Owners and admins keep their core role authority at any tier.
  assert.equal(canWriteRequests(m("owner", "view_only")), true);
  assert.equal(canWriteRequests(m("admin", "view_only")), true);
});

test("the active company's membership decides; unknown memberships are not hidden", () => {
  const companies = [
    { id: 1, memberRoleCode: "viewer", permissionTierCode: "view_only", canExecuteTransactions: false },
    { id: 2, memberRoleCode: "buyer_operator", permissionTierCode: "requester", canExecuteTransactions: false },
  ];
  assert.equal(isViewOnlyMember({ activeCompanyId: 1, companies }), true);
  assert.equal(isViewOnlyMember({ activeCompanyId: 2, companies }), false);
  assert.equal(isViewOnlyMember({ activeCompanyId: 9, companies }), false);
  assert.equal(isViewOnlyMember(null), false);
});

const draft = {
  statusCode: "draft",
  isOpen: false,
  quantity: null,
  quantityUnit: null,
  targetPricePerUnit: null,
  currencyCode: null,
  countryCode: null,
  stateProvince: null,
  needByDate: null,
};

test("status uses the server code and falls back to isOpen", () => {
  assert.equal(wantedStatus(draft), "draft");
  assert.equal(wantedStatus({ isOpen: true }), "open");
  assert.equal(wantedStatus({ statusCode: null, isOpen: false }), "closed");
});

test("drafts are never respondable, even if isOpen were set", () => {
  assert.equal(isRespondable(draft), false);
  assert.equal(isRespondable({ ...draft, isOpen: true }), false);
  assert.equal(isRespondable({ statusCode: "open", isOpen: true }), true);
  assert.equal(isRespondable({ isOpen: true }), true);
});

test("missing values read as not specified, never zero", () => {
  assert.equal(describeWantedQuantity(draft), "Volume not specified");
  assert.equal(describeWantedTargetPrice(draft), "Not specified");
  assert.equal(describeWantedRegion(draft), "Not specified");
  assert.equal(describeNeedBy(draft), "Not specified");
});

test("recorded values are shown as saved", () => {
  assert.equal(describeWantedQuantity({ quantity: 20, quantityUnit: "tonne" }), "20 tonne");
  assert.equal(describeWantedQuantity({ quantity: 20, quantityUnit: null }), "20 (unit not specified)");
  assert.equal(
    describeWantedTargetPrice({ targetPricePerUnit: 425, currencyCode: null, quantityUnit: "tonne" }),
    "(currency not specified) 425 / tonne",
  );
  assert.equal(describeWantedRegion({ stateProvince: "LA", countryCode: "US" }), "LA, US");
  assert.equal(describeNeedBy({ needByDate: "2026-12-01T00:00:00.000Z" }), "2026-12-01");
});
