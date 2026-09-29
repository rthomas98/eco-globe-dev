"use client";

import { LiveEscrowReport } from "@/components/reports/live-reports";

/** Admin escrow ledger: every escrow record, linking to release/unlock actions. */
export function EscrowPage() {
  return <LiveEscrowReport rowHref={(escrow) => `/admin/accounting/escrow/ESC-${escrow.id}`} />;
}
