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
