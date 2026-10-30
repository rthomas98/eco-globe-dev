/**
 * Status decisions for the shared listing editor (seller and admin portals).
 * `serverStatus` is the last status the backend reported, which can move under the
 * editor when documents change (e.g. removing the last SDS returns a listing to draft).
 */

/**
 * - `on-change`: full submission checks only when moving into a submission status (seller).
 * - `always`: full submission checks whenever the target is a submission status (admin).
 */
export type SubmissionValidationPolicy = "on-change" | "always";

export interface StatusChoiceLike {
  value: string;
  label: string;
}

/** Whether saving with `target` selected must pass the full submission checks (including the SDS). */
export function requiresSubmissionValidation({
  target,
  serverStatus,
  submissionStatuses,
  policy,
}: {
  target: string;
  serverStatus: string;
  submissionStatuses: readonly string[];
  policy: SubmissionValidationPolicy;
}) {
  if (!submissionStatuses.includes(target)) return false;
  return policy === "always" || target !== serverStatus;
}

/** Status to send with the PATCH, or undefined to leave the server status unchanged. */
export function statusToWrite({
  target,
  serverStatus,
  writableStatuses,
}: {
  target: string;
  serverStatus: string;
  writableStatuses: readonly string[];
}) {
  return target !== serverStatus && writableStatuses.includes(target) ? target : undefined;
}

function labelFor(status: string, choices: readonly StatusChoiceLike[]) {
  return choices.find((c) => c.value === status)?.label ?? status.replace(/_/g, " ");
}

/**
 * Reconcile the editor after the server reports `nextServer` following a document change.
 * Unchanged server status keeps the user's selection; a changed status replaces the
 * selection and explains what happened, so saving cannot silently keep the new status.
 */
export function reconcileServerStatus({
  previousServer,
  nextServer,
  selected,
  choices,
  writableStatuses,
  submissionStatuses,
}: {
  previousServer: string;
  nextServer: string;
  selected: string;
  choices: readonly StatusChoiceLike[];
  writableStatuses: readonly string[];
  submissionStatuses: readonly string[];
}): { serverStatus: string; selected: string; notice: string | null } {
  if (nextServer === previousServer) return { serverStatus: nextServer, selected, notice: null };
  const resubmit = writableStatuses.includes(previousServer)
    ? previousServer
    : submissionStatuses.find((s) => writableStatuses.includes(s));
  const resubmitLabel = resubmit ? labelFor(resubmit, choices) : null;
  const notice =
    nextServer === "draft"
      ? `Removing the last SDS moved this listing to Draft.${resubmitLabel ? ` Choose ${resubmitLabel} again to ${previousServer === "published" && resubmit === "published" ? "republish" : "resubmit"} after adding an SDS.` : ""}`
      : `The document change moved this listing to ${labelFor(nextServer, choices)}.`;
  return { serverStatus: nextServer, selected: nextServer, notice };
}

/**
 * - `idle`: the baseline matches the last confirmed server status, so Save may run.
 * - `pending`: a document change is in flight or being re-read; Save is blocked until it confirms.
 * - `failed`: the newest re-read failed; Save stays blocked until a retry confirms.
 */
export type StatusSync = "idle" | "pending" | "failed";

export interface ListingStatusState {
  serverStatus: string;
  selected: string;
  notice: string | null;
  sync: StatusSync;
}

export type StatusSaveDecision =
  | { ok: false; reason: "pending" | "failed" }
  | { ok: true; target: string; serverStatus: string; listingStatusCode: string | undefined };

/**
 * Keeps the editor's status baseline in step with server-side status moves caused by
 * document changes. Every change bumps a generation; only the newest generation's re-read
 * can settle the sync state, so an older response resolving late is ignored. A document
 * mutation blocks Save from the moment its request starts (`beginMutation`) until the
 * re-read that follows it (`endMutation`) confirms, whether the mutation succeeded or not.
 * Save is only decided against a confirmed baseline.
 */
export function createListingStatusSync({
  initialStatus,
  fetchServerStatus,
  choices,
  writableStatuses,
  submissionStatuses,
  onChange,
}: {
  initialStatus: string;
  /** Resolves the listing's current status; null or a rejection counts as a failed re-read. */
  fetchServerStatus: () => Promise<string | null | undefined>;
  choices: readonly StatusChoiceLike[];
  writableStatuses: readonly string[];
  submissionStatuses: readonly string[];
  onChange?: (state: ListingStatusState) => void;
}) {
  let state: ListingStatusState = { serverStatus: initialStatus, selected: initialStatus, notice: null, sync: "idle" };
  let generation = 0;
  // Document mutations whose requests have not finished; no re-read settles while any remain.
  let inFlight = 0;
  const set = (next: ListingStatusState) => {
    state = next;
    onChange?.(state);
  };

  /** Re-read the server status after a document change (or on retry). */
  const refresh = async () => {
    const request = ++generation;
    set({ ...state, sync: "pending" });
    let nextServer: string | null | undefined;
    try {
      nextServer = await fetchServerStatus();
    } catch {
      nextServer = null;
    }
    if (request !== generation || inFlight > 0) return;
    if (!nextServer) {
      set({ ...state, sync: "failed" });
      return;
    }
    const result = reconcileServerStatus({
      previousServer: state.serverStatus,
      nextServer,
      selected: state.selected,
      choices,
      writableStatuses,
      submissionStatuses,
    });
    // An unchanged status keeps any earlier explanation (e.g. the move to Draft).
    set({ ...result, notice: result.notice ?? state.notice, sync: "idle" });
  };

  /** A document upload or delete request is starting; Save stays blocked until it settles and re-reads. */
  const beginMutation = () => {
    inFlight += 1;
    generation += 1;
    set({ ...state, sync: "pending" });
  };

  /** The mutation request finished (successfully or not); re-read the status it may have moved. */
  const endMutation = () => {
    inFlight = Math.max(0, inFlight - 1);
    return refresh();
  };

  /** Pick a status; ignored until the baseline is confirmed (the radios are disabled then). */
  const select = (value: string) => {
    if (state.sync !== "idle") return;
    set({ ...state, selected: value, notice: null });
  };

  const decideSave = (): StatusSaveDecision => {
    if (state.sync !== "idle") return { ok: false, reason: state.sync };
    return {
      ok: true,
      target: state.selected,
      serverStatus: state.serverStatus,
      listingStatusCode: statusToWrite({ target: state.selected, serverStatus: state.serverStatus, writableStatuses }),
    };
  };

  return { getState: () => state, refresh, beginMutation, endMutation, select, decideSave };
}
