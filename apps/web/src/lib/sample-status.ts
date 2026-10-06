/**
 * Display for legacy sample-request statuses. The saved status column is free
 * text, so an unknown value is shown as recorded, never mapped to another
 * status.
 */
export interface SampleStatusDisplay {
  label: string;
  bg: string;
  fg: string;
  known: boolean;
}

const KNOWN: Record<string, Omit<SampleStatusDisplay, "known">> = {
  requested: { bg: "#FEF3C7", fg: "#92400E", label: "Requested" },
  accepted: { bg: "#DBEAFE", fg: "#1D4ED8", label: "Accepted" },
  declined: { bg: "#FEE2E2", fg: "#991B1B", label: "Declined" },
  shipped: { bg: "#EDE9FE", fg: "#5B21B6", label: "Shipped" },
  received: { bg: "#DCFCE7", fg: "#166534", label: "Received" },
};

export function sampleStatusDisplay(status: string | null | undefined): SampleStatusDisplay {
  const key = (status ?? "").trim().toLowerCase();
  const known = KNOWN[key];
  if (known) return { ...known, known: true };
  const raw = (status ?? "").trim().replace(/_/g, " ");
  return { bg: "#F5F5F5", fg: "#404040", label: raw ? `${raw} (as recorded)` : "Status not recorded", known: false };
}

/** Shared sample reference used by Orders, Samples and the Tracker. */
export const sampleRef = (id: number) => `SR-${id}`;

export interface LegacySampleInput {
  id: number;
  listingId: number;
  listingTitle: string;
  status: string;
  buyerCompanyName: string;
  sellerCompanyName: string;
}

export interface LegacySampleRow<T extends LegacySampleInput> {
  sample: T;
  ref: string;
  anchorId: string;
  status: SampleStatusDisplay;
  counterparty: string;
}

/**
 * Rows for legacy sample requests as shown on Orders, Sales and Samples: one
 * row per saved request id (newest first), the tracker's SR reference and
 * anchor, the recorded status and the other party for this viewer.
 */
export function legacySampleRows<T extends LegacySampleInput>(samples: T[], role: "buyer" | "seller" | "admin"): LegacySampleRow<T>[] {
  const seen = new Set<number>();
  return samples
    .filter((sample) => (seen.has(sample.id) ? false : (seen.add(sample.id), true)))
    .sort((a, b) => b.id - a.id)
    .map((sample) => ({
      sample,
      ref: sampleRef(sample.id),
      anchorId: `sample-${sample.id}`,
      status: sampleStatusDisplay(sample.status),
      counterparty:
        role === "admin"
          ? `${sample.buyerCompanyName} from ${sample.sellerCompanyName}`
          : role === "seller"
            ? `For ${sample.buyerCompanyName}`
            : `From ${sample.sellerCompanyName}`,
    }));
}
