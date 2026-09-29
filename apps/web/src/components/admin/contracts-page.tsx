"use client";

import { ContractsLedger } from "../contracts/contracts-ledger";

export function AdminContractsPage({ contractId }: { contractId?: string }) {
  return <ContractsLedger role="admin" view="contracts" highlightId={contractId} />;
}
