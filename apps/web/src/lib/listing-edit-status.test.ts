import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileServerStatus, requiresSubmissionValidation, statusToWrite } from "./listing-edit-status.ts";

const ADMIN = {
  choices: [
    { value: "draft", label: "Draft" },
    { value: "pending_review", label: "Pending review" },
    { value: "published", label: "Published" },
    { value: "paused", label: "Paused" },
    { value: "closed", label: "Closed" },
  ],
  writableStatuses: ["draft", "pending_review", "published", "paused", "closed"],
  submissionStatuses: ["pending_review", "published"],
};
const SELLER = {
  choices: [
    { value: "published", label: "Published (edits return to review)" },
    { value: "draft", label: "Draft" },
    { value: "pending_review", label: "Pending review (submit)" },
    { value: "paused", label: "Paused" },
    { value: "closed", label: "Closed" },
  ],
  writableStatuses: ["draft", "pending_review", "paused", "closed"],
  submissionStatuses: ["pending_review"],
};

test("admin: remove last SDS -> upload replacement -> republish sends published explicitly", () => {
  let serverStatus = "published";
  let selected = "published";

  // Admin deletes the last SDS; the server moves the listing to draft.
  const afterDelete = reconcileServerStatus({ previousServer: serverStatus, nextServer: "draft", selected, ...ADMIN });
  assert.equal(afterDelete.serverStatus, "draft");
  assert.equal(afterDelete.selected, "draft");
  assert.equal(
    afterDelete.notice,
    "Removing the last SDS moved this listing to Draft. Choose Published again to republish after adding an SDS.",
  );
  ({ serverStatus, selected } = afterDelete);

  // Admin upload keeps the server status, so the selection and baseline stay put.
  const afterUpload = reconcileServerStatus({ previousServer: serverStatus, nextServer: "draft", selected, ...ADMIN });
  assert.deepEqual(afterUpload, { serverStatus: "draft", selected: "draft", notice: null });

  // The admin chooses Published again and saves.
  selected = "published";
  assert.equal(statusToWrite({ target: selected, serverStatus, writableStatuses: ADMIN.writableStatuses }), "published");
  assert.equal(
    requiresSubmissionValidation({ target: selected, serverStatus, submissionStatuses: ADMIN.submissionStatuses, policy: "always" }),
    true,
  );
});

test("a stale Published selection against a draft server status is still written", () => {
  assert.equal(statusToWrite({ target: "published", serverStatus: "draft", writableStatuses: ADMIN.writableStatuses }), "published");
  assert.equal(statusToWrite({ target: "published", serverStatus: "published", writableStatuses: ADMIN.writableStatuses }), undefined);
});

test("seller: statuses outside the writable set are never sent", () => {
  assert.equal(statusToWrite({ target: "published", serverStatus: "draft", writableStatuses: SELLER.writableStatuses }), undefined);
  assert.equal(statusToWrite({ target: "pending_review", serverStatus: "draft", writableStatuses: SELLER.writableStatuses }), "pending_review");
});

test("seller: upload on a published listing reports the move to pending review", () => {
  const result = reconcileServerStatus({ previousServer: "published", nextServer: "pending_review", selected: "published", ...SELLER });
  assert.deepEqual(result, {
    serverStatus: "pending_review",
    selected: "pending_review",
    notice: "The document change moved this listing to Pending review (submit).",
  });
});

test("seller: removing the last SDS on a published listing points back to Pending review", () => {
  const result = reconcileServerStatus({ previousServer: "published", nextServer: "draft", selected: "published", ...SELLER });
  assert.equal(
    result.notice,
    "Removing the last SDS moved this listing to Draft. Choose Pending review (submit) again to resubmit after adding an SDS.",
  );
});

test("unchanged server status keeps an unsaved selection", () => {
  assert.deepEqual(
    reconcileServerStatus({ previousServer: "draft", nextServer: "draft", selected: "paused", ...ADMIN }),
    { serverStatus: "draft", selected: "paused", notice: null },
  );
});

test("admin policy validates submission statuses even when unchanged", () => {
  const base = { submissionStatuses: ADMIN.submissionStatuses, policy: "always" as const };
  assert.equal(requiresSubmissionValidation({ ...base, target: "published", serverStatus: "published" }), true);
  assert.equal(requiresSubmissionValidation({ ...base, target: "pending_review", serverStatus: "pending_review" }), true);
  assert.equal(requiresSubmissionValidation({ ...base, target: "paused", serverStatus: "published" }), false);
  assert.equal(requiresSubmissionValidation({ ...base, target: "draft", serverStatus: "draft" }), false);
});

test("seller policy validates only when moving into a submission status", () => {
  const base = { submissionStatuses: SELLER.submissionStatuses, policy: "on-change" as const };
  assert.equal(requiresSubmissionValidation({ ...base, target: "pending_review", serverStatus: "draft" }), true);
  assert.equal(requiresSubmissionValidation({ ...base, target: "pending_review", serverStatus: "pending_review" }), false);
  assert.equal(requiresSubmissionValidation({ ...base, target: "published", serverStatus: "published" }), false);
  assert.equal(requiresSubmissionValidation({ ...base, target: "draft", serverStatus: "published" }), false);
});
