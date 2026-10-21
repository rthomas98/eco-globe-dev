import type { DemoPlaylistResponse, DemoPlaylistSlug } from "../../shared/src/demo-playlists-api.js";

/** Private reviewed intake. Never returned by catalogue routes. */
export type DemoPlaylistSource = {
  entryId: string;
  kind: "listing" | "wanted" | "market_record";
  id: number;
  /** MarketRecord API 16-hex version; draft hashes can be obtained with readDemoPlaylistSourceVersion. */
  expectedVersion?: string;
  provenance: Record<string, unknown>;
};
export type DemoPlaylistPlan = {
  approvedByUserId: number;
  intakeId: string;
  sourceHashes: string[];
  detail: DemoPlaylistResponse;
  sources: DemoPlaylistSource[];
  profileProvenance: Record<string, unknown>;
  relationshipProvenance: Record<string, unknown>;
  reason: string;
};
export type DemoPlaylistPreview = { id: string; digest: string; expiresAt: string; totals: { companies: number; materials: number; relationships: number } };
export type DemoPlaylistCommitInput = { previewId: string; expectedDigest: string; idempotencyKey: string; approvedByUserId: number; reason: string };
export type DemoPlaylistCommitReceipt = { previewId: string; digest: string; playlistSlug: DemoPlaylistSlug; revision: number; created: number; unchanged: number };
