/**
 * Validation for a buyer request for quote before it is posted. Kept
 * import-free for node:test. Nothing is defaulted: an invalid quantity, price
 * or delivery region is reported instead of being replaced.
 */
export interface RfqDraft {
  title: string;
  quantity: string;
  targetPrice: string;
  /** Delivery country and region, from a saved facility or entered by the buyer. */
  countryCode: string;
  stateProvince: string;
}

export interface ValidRfq {
  title: string;
  quantity: number;
  targetPricePerUnit?: number;
  countryCode: string;
  stateProvince?: string;
}

function parseNumber(input: string) {
  const trimmed = input.replace(/,/g, "").trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function validateRfqDraft(
  draft: RfqDraft,
): { ok: true; value: ValidRfq } | { ok: false; error: string } {
  const title = draft.title.trim();
  if (!title) return { ok: false, error: "Enter a title for your request." };

  const quantity = parseNumber(draft.quantity);
  if (quantity === null || Number.isNaN(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be a number greater than zero." };
  }

  const price = parseNumber(draft.targetPrice);
  if (price !== null && (Number.isNaN(price) || price < 0)) {
    return { ok: false, error: "Target price must be a number (no ranges or currency symbols), or left blank." };
  }

  const countryCode = draft.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, error: "Choose a saved delivery facility or enter a two-letter delivery country code." };
  }

  return {
    ok: true,
    value: {
      title,
      quantity,
      targetPricePerUnit: price === null ? undefined : Math.round(price * 100) / 100,
      countryCode,
      stateProvince: draft.stateProvince.trim() || undefined,
    },
  };
}
