"use client";

import { ContractsLedger } from "../contracts/contracts-ledger";
import { BuyerLayout } from "./buyer-layout";

export function BuyerContractsPage() {
  return (
    <BuyerLayout>
      <ContractsLedger role="buyer" view="contracts" />
    </BuyerLayout>
  );
}
