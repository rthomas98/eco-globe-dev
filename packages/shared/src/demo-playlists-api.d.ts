/** Approved public presentation DTO. Private provenance is never part of these shapes. */
export type DemoPlaylistSlug = "fuel-lsu" | "all";
export type DemoPlaylistSummary = { slug: DemoPlaylistSlug; name: string };
export type DemoPlaylistList = { ok: true; playlists: DemoPlaylistSummary[] };
export type DemoNumber =
  | { kind: "scalar"; value: number }
  | { kind: "range"; min: number; max: number }
  | { kind: "text"; text: string };
export type DemoValueBasis = "source" | "source_estimate" | "demo_estimate";
export type DemoPrice =
  | { kind: "missing" }
  | { kind: "value"; amount: DemoNumber; currencyCode: string; perUnit: string;
      direction: "buyer_pays" | "seller_pays_gate_fee"; basis: DemoValueBasis };
export type DemoVolume =
  | { kind: "missing" }
  | { kind: "value"; amount: DemoNumber; unit: string;
      period: "annual" | "monthly" | "daily" | "scenario" | "unspecified";
      basis: DemoValueBasis };
export type DemoGeography =
  | { kind: "pending"; reason: "missing_location" | "missing_country" | "conflicting_address" | "unreviewed" | "unresolved" }
  | { kind: "point"; latitude: number; longitude: number;
      precision: "reviewed_address" | "postal_area";
      purpose: "facility" | "headquarters" | "office" | "unknown";
      label: string; countryCode: string; postalCode: string | null };
export type DemoSourceStatus = "confirmed_stream" | "identified_stream" | "estimate" | "prospect" | "buyer_need" | "unconfirmed";
export type DemoPlaylistCompany = {
  id: string; name: string; description: string | null;
  membership: "primary" | "related";
  materialState: "available" | "no_material_data";
  geography: DemoGeography;
};
export type DemoPlaylistMaterial = {
  id: string; companyId: string; kind: "seller" | "buyer";
  title: string; materialTypeCode: string; sourceStatus: DemoSourceStatus;
  qualifier: string | null; equivalents: string[];
  price: DemoPrice; volume: DemoVolume; geography: DemoGeography;
};
export type DemoRelationshipTarget =
  | { kind: "company"; companyId: string }
  | { kind: "group"; label: string };
export type DemoPlaylistRelationship = {
  id: string; fromCompanyId: string; target: DemoRelationshipTarget;
  kind: "potential_buyer" | "potential_provider" | "potential_synergy" | "similar_generator";
  material: string; materialTypeCode: string | null;
};
export type DemoPlaylistResponse = {
  ok: true; playlist: DemoPlaylistSummary;
  companies: DemoPlaylistCompany[];
  materials: DemoPlaylistMaterial[];
  relationships: DemoPlaylistRelationship[];
  counts: { companies: number; materials: number; mapped: number; pending: number };
};
