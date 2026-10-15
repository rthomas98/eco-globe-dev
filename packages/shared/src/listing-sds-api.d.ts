/** Buyer-company scoped state; current usable seller SDS takes precedence. */
export type ListingSdsRequestState =
  | { status: "available"; listingId: number }
  | { status: "not_requested"; listingId: number }
  | { status: "requested"; listingId: number; id: number; requestedAt: string };
export type ListingSdsRequestResponse = {
  ok: true;
  sdsRequest: ListingSdsRequestState;
};
export type ListingSdsRequestWriteResponse = {
  ok: true;
  created: boolean;
  sdsRequest: Extract<ListingSdsRequestState, { status: "requested" }>;
};
/** Match with in_app channel, compliance category, and listing record type. */
export type SdsRequestNotificationSubject = "SDS requested";
