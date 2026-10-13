import type { SampleConfig } from "./api-sample-shipping";

// The backend marks a sample eligible only for standard solid material on a
// domestic US route to a verified site, so that scope is stated only then.
export function sampleCheckoutScope(
  config: Pick<SampleConfig, "mode" | "eligibility">,
): string {
  return config.eligibility.eligible && config.mode !== "unavailable"
    ? "domestic US · standard material"
    : "EcoGlobe-assisted inquiry";
}
