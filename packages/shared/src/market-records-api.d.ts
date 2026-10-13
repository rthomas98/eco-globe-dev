/** Internal research only. These records do not represent accounts or available stock. */
export type MarketReviewStatus = "unknown" | "estimated" | "confirmed";
export type MarketRecordRole = "seller" | "buyer";
export type MarketSourceType =
  | "confirmed_stream"
  | "identified_stream"
  | "estimate"
  | "prospect"
  | "buyer_need";
export type MarketReview = {
  status: MarketReviewStatus;
  citation: string | null;
  reviewedByUserId: number | null;
  reviewedByUserName: string | null;
  reviewedAt: string | null;
};
export type MarketAddress = {
  street: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  purpose: "unknown" | "headquarters" | "office" | "facility" | "pickup";
};
export type MarketPrice = MarketReview & {
  value: string | null;
  currencyCode: string | null;
  perUnit: string | null;
};
export type MarketVolume = MarketReview & {
  value: string | null;
  unit: string | null;
  period: "annual" | "unspecified";
};
export type MarketRecordData = {
  role: MarketRecordRole;
  companyName: string;
  facilityName: string | null;
  feedstock: string;
  feedstockGroup: string | null;
  buyerNeed: string | null;
  sourceRecordType: MarketSourceType;
  sourceChecked: boolean | null;
  sourceCitation: string | null;
  addressSource: string | null;
  sourceCheckedBy: string | null;
  sourceCheckedAt: string | null;
  address: MarketAddress;
  addressReview: MarketReview;
  price: MarketPrice;
  volume: MarketVolume;
};
export type MarketRecord = MarketRecordData & {
  id: number;
  version: string;
  status: "active" | "archived";
  archivedAt: string | null;
  archivedByUserId: number | null;
  archivedByUserName: string | null;
  archiveReason: string | null;
  importBatchId: string | null;
  sourceRowRef: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number;
  updatedByUserId: number;
  createdByUserName: string | null;
  updatedByUserName: string | null;
};
export type MarketRecordInput = Omit<
  MarketRecordData,
  "price" | "volume" | "addressReview"
> & {
  price: Pick<MarketPrice, "value" | "currencyCode" | "perUnit" | "citation">;
  volume: Pick<MarketVolume, "value" | "unit" | "period" | "citation">;
};
export type MarketDiagnostic = {
  severity: "info" | "warning" | "error";
  code: string;
  field: string | null;
  message: string;
};
export type MarketPreviewRow = {
  rowKey: string;
  sheet: string;
  rowNumber: number;
  proposedRecord: MarketRecordData | null;
  decision: "create" | "skip" | "error";
  diagnostics: MarketDiagnostic[];
  duplicateOfId: number | null;
};
export type MarketPreview = {
  ok: true;
  previewId: string;
  expiresAt: string;
  fileSha256: string;
  rows: MarketPreviewRow[];
  state: "preview" | "committed";
  result: MarketCommitResult | null;
  totals: {
    sourceRows: number;
    createRows: number;
    duplicateRows: number;
    errorRows: number;
    ignoredRows: number;
  };
};
export type MarketCommitRequest = {
  idempotencyKey: string;
  excludedRowKeys: string[];
  reason: string;
};
export type MarketCommitResult = {
  ok: true;
  importId: string;
  createdIds: number[];
  skippedRows: { rowKey: string; code: string; duplicateOfId: number | null }[];
  totals: {
    created: number;
    duplicates: number;
    excluded: number;
    ignored: number;
  };
};
export type MarketAuditEvent = {
  id: number;
  action: string;
  actorUserId: number;
  actorUserName: string | null;
  createdAt: string;
  reason: string | null;
  previous: MarketRecord | null;
  next: MarketRecord | null;
};
export type MarketRecordList = {
  ok: true;
  records: MarketRecord[];
  total: number;
  nextCursor: string | null;
};
export type MarketAuditList = {
  ok: true;
  events: MarketAuditEvent[];
  nextCursor: string | null;
};
export type MarketRecordResponse = { ok: true; record: MarketRecord };
