import { hasDemoEstimateMarker, parseDemoEstimateFields } from "@eco-globe/shared";
import { combineDemoEstimateFields, type DemoEstimateFields } from "./demo-estimate-format";

export * from "./demo-estimate-format";

/** Reads the demo note from a listing description or buyer request notes. */
export function readDemoEstimates(text: unknown): DemoEstimateFields {
  return combineDemoEstimateFields(hasDemoEstimateMarker(text), parseDemoEstimateFields(text));
}
