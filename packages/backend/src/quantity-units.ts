/** Spelling aliases only. This never converts quantities or ambiguous tons. */
export function canonicalQuantityUnit(value: string): string {
  const unit = value.trim().toLowerCase();
  if (unit === "units") return "unit";
  if (unit === "tonnes" || unit === "t") return "tonne";
  return unit;
}

export function sameQuantityUnit(left: string, right: string): boolean {
  const unit = canonicalQuantityUnit(left);
  return unit.length > 0 && unit === canonicalQuantityUnit(right);
}
