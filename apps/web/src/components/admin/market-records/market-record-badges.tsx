import { CircleCheck, CircleDashed, CircleHelp, ShieldCheck, ShieldOff } from "lucide-react";
import { isDemoEstimateCitation } from "@eco-globe/shared";
import {
  addressPurposeLabel,
  researchFieldStatusLabel,
  sourceCheckedLabel,
  sourceRecordTypeLabel,
  type AddressPurpose,
  type MarketFieldStatus,
} from "@/lib/market-record-format";

/*
 * Every badge carries its meaning in text; colour is only reinforcement.
 * "Checked by EcoGlobe" and "Record type" are deliberately separate badges.
 */

const pill = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium";

export function RoleBadge({ role }: { role: "seller" | "buyer" }) {
  return (
    <span className={`${pill} ${role === "seller" ? "bg-sky-50 text-sky-800" : "bg-violet-50 text-violet-800"}`}>
      {role === "seller" ? "Seller" : "Buyer"}
    </span>
  );
}

export function SourceRecordTypeBadge({ code }: { code: string | null }) {
  return (
    <span className={`${pill} bg-neutral-100 text-neutral-800`}>
      <span className="sr-only">Record type: </span>
      {sourceRecordTypeLabel(code)}
    </span>
  );
}

export function SourceCheckedBadge({ checked }: { checked: boolean | null }) {
  const Icon = checked === true ? ShieldCheck : checked === false ? ShieldOff : CircleHelp;
  const tone =
    checked === true
      ? "bg-emerald-50 text-emerald-800"
      : checked === false
        ? "bg-amber-50 text-amber-900"
        : "bg-neutral-100 text-neutral-700";
  return (
    <span className={`${pill} ${tone}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {sourceCheckedLabel(checked)}
    </span>
  );
}

export function FieldStatusBadge({
  field,
  status,
  citation,
}: {
  field?: string;
  status: MarketFieldStatus;
  /** Price/volume citation; the demo fallback citation changes the label. */
  citation?: string | null;
}) {
  const Icon = status === "confirmed" ? CircleCheck : status === "estimated" ? CircleDashed : CircleHelp;
  const tone =
    status === "confirmed"
      ? "bg-emerald-50 text-emerald-800"
      : status === "estimated"
        ? "bg-amber-50 text-amber-900"
        : "bg-neutral-100 text-neutral-700";
  return (
    <span className={`${pill} ${tone}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {field ? `${field}: ` : ""}
      {researchFieldStatusLabel(status, isDemoEstimateCitation(citation))}
    </span>
  );
}

export function AddressPurposeBadge({ purpose }: { purpose: AddressPurpose }) {
  return (
    <span className={`${pill} ${purpose === "pickup" ? "bg-emerald-50 text-emerald-800" : "bg-neutral-100 text-neutral-700"}`}>
      {addressPurposeLabel(purpose)}
    </span>
  );
}

export function ArchivedBadge() {
  return <span className={`${pill} bg-neutral-900 text-white`}>Archived</span>;
}
