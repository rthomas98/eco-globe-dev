/** Synthetic presentation fixture for unit and owned SQL verification only. */
import { randomUUID } from "node:crypto";
import type { DemoPlaylistResponse, DemoPlaylistMaterial } from "../../shared/src/demo-playlists-api.js";
export function playlistFixture(): DemoPlaylistResponse {
  const companyId = randomUUID();
  const material: DemoPlaylistMaterial = { id: randomUUID(), companyId, kind: "seller", title: "Synthetic zero-price gallon stream", materialTypeCode: "other", sourceStatus: "identified_stream", qualifier: null, equivalents: [], price: { kind: "value", amount: { kind: "scalar", value: 0 }, currencyCode: "USD", perUnit: "gallon", direction: "buyer_pays", basis: "source" }, volume: { kind: "value", amount: { kind: "scalar", value: 390000 }, unit: "gallon", period: "annual", basis: "source" }, geography: { kind: "pending", reason: "missing_location" } };
  const companies: DemoPlaylistResponse["companies"] = Array.from({ length: 11 }, (_,i) => ({ id: i === 0 ? companyId : randomUUID(), name: `Synthetic company ${i+1}`, description: "Synthetic reviewed company profile", membership: "primary", materialState: i === 0 ? "available" : "no_material_data", geography: { kind: "pending", reason: "missing_location" } }));
  return { ok: true, playlist: { slug: "fuel-lsu", name: "Synthetic FUEL/LSU" }, companies, materials: [material], relationships: [{ id: randomUUID(), fromCompanyId: companyId, target: { kind: "group", label: "Potential industrial users" }, kind: "potential_buyer", material: "Synthetic material", materialTypeCode: null }], counts: { companies: 11, materials: 1, mapped: 0, pending: 1 } };
}
