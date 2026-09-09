/** Lab referrals: no booking, pricing or accreditation promise. */
export type LabSharing = "private" | "shared";
export type LabTurnaround = "standard" | "expedited" | "not_urgent";
export type LabRequestStatus =
  | "requested"
  | "reviewing"
  | "awaiting_sample"
  | "testing"
  | "completed"
  | "cancelled";
export type LabOptionalTest = {
  id: string;
  group: "processing" | "safety" | "compliance" | "consistency";
  label: string;
};
export type LabPanel = {
  id: number;
  familyCode: string;
  version: number;
  name: string;
  materialTypeCodes: string[];
  tests: string[];
  optionalTests: LabOptionalTest[];
  status: "draft" | "published" | "retired";
};
export type LabConfig = {
  listingId: number;
  listingTitle: string;
  sellerCompanyName: string;
  locationLabel: string;
  categoryCode: string;
  panel: LabPanel | null;
  scopeToBeConfirmed: boolean;
  optionalTests: LabOptionalTest[];
};
export type LabRequestWrite = {
  listingId: number;
  sampleRequestId?: number | null;
  idempotencyKey: string;
  panelId: number | null;
  panelVersion: number | null;
  optionalTestIds: string[];
  concerns?: string;
  turnaround: LabTurnaround;
  sharing: LabSharing;
};
export type LabResult = { label: string; value: string; unit: string };
export type LabReport = {
  id: number;
  sharing: LabSharing;
  listingId: number;
  requestId: number;
  laboratoryName: string;
  batchReference: string;
  sampleDate: string;
  reportDate: string;
  results: LabResult[];
  fileName: string;
  byteLength: number;
  sha256: string;
  fileUrl: string;
  published: boolean;
};
export type LabRequest = {
  id: number;
  listingId: number;
  listingTitle: string;
  sampleRequestId: number | null;
  companyId: number;
  categoryCode: string;
  panelId: number | null;
  panelVersion: number | null;
  scope: LabConfig;
  optionalTestIds: string[];
  concerns: string;
  turnaround: LabTurnaround;
  sharing: LabSharing;
  status: LabRequestStatus;
  createdAt: string;
  reports: LabReport[];
};
export type LabAdminRequest = LabRequest & {
  ownerUserId: number | null;
  notes: string;
  companyName: string;
  requestedByName: string;
  requestedByEmail: string;
};
export type LabReview = {
  laboratoryName: string;
  reviewedBy: string;
  reviewedAt: string;
  evidence: string;
};
export type LabPanelWrite = Omit<LabPanel, "id" | "version"> & {
  review?: LabReview;
};
export type LabReportWrite = {
  laboratoryName: string;
  batchReference: string;
  sampleDate: string;
  reportDate: string;
  results: LabResult[];
  fileName: string;
  contentBase64: string;
  published: boolean;
};
