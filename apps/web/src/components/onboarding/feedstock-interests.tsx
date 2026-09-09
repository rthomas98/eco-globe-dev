"use client";

import { Input } from "@eco-globe/ui";

export const FEEDSTOCK_INTEREST_OPTIONS = [
  { value: "plastics", label: "Plastics" },
  { value: "biomass", label: "Biomass & Wood" },
  { value: "rubber", label: "Rubber & Tire-Derived" },
  { value: "oils", label: "Oils & Liquid Feedstocks" },
  { value: "metals", label: "Metals & Alloys" },
  { value: "paper", label: "Paper & Cardboard" },
  { value: "textiles", label: "Textiles" },
  { value: "chemical_byproducts", label: "Chemical Byproducts" },
  { value: "refinery_byproducts", label: "Refinery Byproducts" },
  { value: "others", label: "Others" },
] as const;

export const OTHERS_CODE = "others";

export interface FeedstockInterestValue {
  codes: string[];
  otherDescription: string;
}

export function feedstockInterestsValid(value: FeedstockInterestValue) {
  return !value.codes.includes(OTHERS_CODE) || value.otherDescription.trim().length > 0;
}

/** Multi-select feedstock interests with an "Others" description, persisted through onboarding. */
export function FeedstockInterestsField({
  label,
  value,
  onChange,
  otherLabel = "Describe the other feedstock",
}: {
  label: string;
  value: FeedstockInterestValue;
  onChange: (next: FeedstockInterestValue) => void;
  otherLabel?: string;
}) {
  const toggle = (code: string) => {
    const codes = value.codes.includes(code) ? value.codes.filter((c) => c !== code) : [...value.codes, code];
    onChange({ ...value, codes });
  };
  const showOther = value.codes.includes(OTHERS_CODE);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-base font-medium text-neutral-900">{label}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FEEDSTOCK_INTEREST_OPTIONS.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-800" style={{ border: "1px solid #E0E0E0" }}>
            <input type="checkbox" checked={value.codes.includes(option.value)} onChange={() => toggle(option.value)} className="size-4 accent-neutral-900" />
            {option.label}
          </label>
        ))}
      </div>
      {showOther && (
        <Input
          label={otherLabel}
          id="other-feedstock"
          value={value.otherDescription}
          onChange={(e) => onChange({ ...value, otherDescription: e.target.value })}
          placeholder="Required when Others is selected"
        />
      )}
    </fieldset>
  );
}
