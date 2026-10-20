import { readWorkbookRangeCitation } from "@eco-globe/shared";
import type { MarketPrice, MarketVolume } from "@eco-globe/shared/market-records-api";
import { describeResearchPrice, describeResearchVolume, researchValueLabel } from "./market-record-format";

/** Research price text, showing a preserved workbook range when the number is unknown. */
export function researchPriceText(price: MarketPrice) {
  return researchValueLabel(describeResearchPrice(price), price.value, readWorkbookRangeCitation(price.citation));
}

/** Research volume text, showing a preserved workbook range when the number is unknown. */
export function researchVolumeText(volume: MarketVolume) {
  return researchValueLabel(describeResearchVolume(volume), volume.value, readWorkbookRangeCitation(volume.citation));
}
