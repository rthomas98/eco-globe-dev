"use client";

import { ContractsLedger } from "../contracts/contracts-ledger";

export function AdminESignaturesPage({ envelopeId }: { envelopeId?: string }) {
  return <ContractsLedger role="admin" view="signatures" highlightId={envelopeId} />;
}
