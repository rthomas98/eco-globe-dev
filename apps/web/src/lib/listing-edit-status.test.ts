import { test } from "node:test";
import assert from "node:assert/strict";
import { createListingStatusSync, reconcileServerStatus, requiresSubmissionValidation, statusToWrite } from "./listing-edit-status.ts";

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

/** A status fetch whose responses the test resolves (or rejects) by hand, in any order. */
function deferredFetches() {
  const calls: { resolve: (status: string | null) => void; reject: (err: Error) => void }[] = [];
  const fetchServerStatus = () =>
    new Promise<string | null>((resolve, reject) => {
      calls.push({ resolve, reject });
    });
  return { calls, fetchServerStatus };
}

test("admin: stalled re-reads after delete and upload block Save until the newest confirms Draft", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const sync = createListingStatusSync({ initialStatus: "published", fetchServerStatus, ...ADMIN });

  // Delete the last SDS (server -> draft); its re-read stalls.
  const deleteRefresh = sync.refresh();
  assert.equal(sync.getState().sync, "pending");
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "pending" });

  // Upload a replacement; its re-read stalls too. Save stays blocked on the stale Published baseline.
  const uploadRefresh = sync.refresh();
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "pending" });
  // Status picks are ignored while unconfirmed (the radios are disabled).
  sync.select("paused");
  assert.equal(sync.getState().selected, "published");

  // Newest re-read resolves first and confirms Draft.
  calls[1]!.resolve("draft");
  await uploadRefresh;
  assert.equal(sync.getState().sync, "idle");
  assert.equal(sync.getState().serverStatus, "draft");
  assert.equal(sync.getState().selected, "draft");
  assert.match(sync.getState().notice ?? "", /Choose Published again to republish/);

  // The older re-read resolving late (with a stale value) is ignored.
  calls[0]!.resolve("published");
  await deleteRefresh;
  assert.equal(sync.getState().serverStatus, "draft");
  assert.equal(sync.getState().sync, "idle");

  sync.select("published");
  assert.deepEqual(sync.decideSave(), { ok: true, target: "published", serverStatus: "draft", listingStatusCode: "published" });
});

test("an older re-read resolving after the newer one is still pending cannot clear pending", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const sync = createListingStatusSync({ initialStatus: "published", fetchServerStatus, ...ADMIN });
  const older = sync.refresh();
  const newer = sync.refresh();

  calls[0]!.resolve("draft");
  await older;
  assert.equal(sync.getState().sync, "pending");
  assert.equal(sync.getState().serverStatus, "published");
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "pending" });

  calls[1]!.resolve("draft");
  await newer;
  assert.equal(sync.getState().serverStatus, "draft");
  sync.select("published");
  assert.deepEqual(sync.decideSave(), { ok: true, target: "published", serverStatus: "draft", listingStatusCode: "published" });
});

test("an older failure after a newer success does not block Save", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const sync = createListingStatusSync({ initialStatus: "published", fetchServerStatus, ...ADMIN });
  const older = sync.refresh();
  const newer = sync.refresh();
  calls[1]!.resolve("draft");
  await newer;
  calls[0]!.reject(new Error("network"));
  await older;
  assert.equal(sync.getState().sync, "idle");
  assert.equal(sync.getState().serverStatus, "draft");
});

test("a failed re-read keeps Save blocked until a retry confirms the baseline", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const sync = createListingStatusSync({ initialStatus: "published", fetchServerStatus, ...ADMIN });

  const first = sync.refresh();
  calls[0]!.reject(new Error("network"));
  await first;
  assert.equal(sync.getState().sync, "failed");
  assert.equal(sync.getState().serverStatus, "published");
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "failed" });
  sync.select("published");
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "failed" });

  // A missing listing also counts as a failure.
  const second = sync.refresh();
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "pending" });
  calls[1]!.resolve(null);
  await second;
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "failed" });

  // Retry succeeds with Draft; the admin chooses Published and it is sent explicitly.
  const retry = sync.refresh();
  calls[2]!.resolve("draft");
  await retry;
  assert.equal(sync.getState().sync, "idle");
  sync.select("published");
  assert.deepEqual(sync.decideSave(), { ok: true, target: "published", serverStatus: "draft", listingStatusCode: "published" });
});

test("onChange mirrors every state transition", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const seen: string[] = [];
  const sync = createListingStatusSync({
    initialStatus: "draft",
    fetchServerStatus,
    ...ADMIN,
    onChange: (s) => seen.push(`${s.sync}:${s.serverStatus}:${s.selected}`),
  });
  sync.select("paused");
  const refresh = sync.refresh();
  calls[0]!.resolve("draft");
  await refresh;
  assert.deepEqual(seen, ["idle:draft:paused", "pending:draft:paused", "idle:draft:paused"]);
});

test("seller: unchanged status after an upload keeps the selection and seller-writable rules", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const sync = createListingStatusSync({ initialStatus: "published", fetchServerStatus, ...SELLER });
  const refresh = sync.refresh();
  calls[0]!.resolve("pending_review");
  await refresh;
  assert.equal(sync.getState().selected, "pending_review");
  assert.deepEqual(sync.decideSave(), { ok: true, target: "pending_review", serverStatus: "pending_review", listingStatusCode: undefined });
  sync.select("published");
  assert.deepEqual(sync.decideSave(), { ok: true, target: "published", serverStatus: "pending_review", listingStatusCode: undefined });
});

test("Save is blocked while a document mutation request is still in flight", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const sync = createListingStatusSync({ initialStatus: "published", fetchServerStatus, ...ADMIN });

  // The delete request has started but not returned; nothing has been re-read yet.
  sync.beginMutation();
  assert.equal(calls.length, 0);
  assert.equal(sync.getState().sync, "pending");
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "pending" });
  sync.select("paused");
  assert.equal(sync.getState().selected, "published");

  // The request finishes; the re-read it triggers keeps Save blocked until it confirms.
  const settled = sync.endMutation();
  assert.equal(calls.length, 1);
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "pending" });
  calls[0]!.resolve("draft");
  await settled;
  assert.equal(sync.getState().sync, "idle");
  assert.equal(sync.getState().serverStatus, "draft");
  sync.select("published");
  assert.deepEqual(sync.decideSave(), { ok: true, target: "published", serverStatus: "draft", listingStatusCode: "published" });
});

test("a failed mutation still re-reads, and a successful re-read re-enables Save", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const sync = createListingStatusSync({ initialStatus: "published", fetchServerStatus, ...ADMIN });

  sync.beginMutation();
  // The upload request rejected; the uploader still reports it settled.
  const settled = sync.endMutation();
  assert.equal(calls.length, 1);
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "pending" });
  calls[0]!.resolve("published");
  await settled;
  assert.equal(sync.getState().sync, "idle");
  assert.equal(sync.getState().serverStatus, "published");
  assert.deepEqual(sync.decideSave(), { ok: true, target: "published", serverStatus: "published", listingStatusCode: undefined });

  // If that re-read fails instead, Save stays blocked with Retry available.
  sync.beginMutation();
  const failed = sync.endMutation();
  calls[1]!.reject(new Error("network"));
  await failed;
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "failed" });
  const retry = sync.refresh();
  calls[2]!.resolve("published");
  await retry;
  assert.equal(sync.getState().sync, "idle");
});

test("a mutation started while an older re-read is pending outranks it", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const sync = createListingStatusSync({ initialStatus: "published", fetchServerStatus, ...ADMIN });

  // An earlier change's re-read is still pending when a new delete request starts.
  const older = sync.refresh();
  sync.beginMutation();

  // The older re-read resolving now cannot settle the sync: the delete is still in flight.
  calls[0]!.resolve("published");
  await older;
  assert.equal(sync.getState().sync, "pending");
  assert.deepEqual(sync.decideSave(), { ok: false, reason: "pending" });

  const settled = sync.endMutation();
  calls[1]!.resolve("draft");
  await settled;
  assert.equal(sync.getState().sync, "idle");
  assert.equal(sync.getState().serverStatus, "draft");
});

test("overlapping mutations keep Save blocked until the last one settles and re-reads", async () => {
  const { calls, fetchServerStatus } = deferredFetches();
  const sync = createListingStatusSync({ initialStatus: "published", fetchServerStatus, ...ADMIN });

  sync.beginMutation(); // SDS delete
  sync.beginMutation(); // photo upload
  const first = sync.endMutation();
  calls[0]!.resolve("draft");
  await first;
  // The photo upload is still in flight, so the confirmed read does not unblock Save.
  assert.equal(sync.getState().sync, "pending");
  assert.equal(sync.getState().serverStatus, "published");

  const second = sync.endMutation();
  calls[1]!.resolve("draft");
  await second;
  assert.equal(sync.getState().sync, "idle");
  assert.equal(sync.getState().serverStatus, "draft");
});
