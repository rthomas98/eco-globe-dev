"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { describeBackendError } from "@/lib/backend-client";
import {
  createMarketRecord,
  marketRecordErrorDetails,
  type MarketRecordInput,
} from "@/lib/api-market-records";
import { MarketRecordForm } from "./market-record-form";
import { MarketRecordShell } from "./market-record-shell";

export function MarketRecordCreatePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<React.ReactNode>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();

  const submit = async (input: MarketRecordInput) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const record = await createMarketRecord(input);
      router.push(`/admin/market-records/${record.id}`);
    } catch (caught) {
      const details = marketRecordErrorDetails(caught);
      setFieldErrors(details.fieldErrors);
      setError(
        details.code === "duplicate_identity" && details.existingId !== null ? (
          <>
            A record with the same side, company, facility, address and feedstock already exists.{" "}
            <Link href={`/admin/market-records/${details.existingId}`} className="font-semibold underline">
              Open the existing record
            </Link>{" "}
            instead of creating a duplicate. Your entries are still in the form.
          </>
        ) : (
          `${describeBackendError(caught, "The record could not be created.")} Your entries are still in the form.`
        ),
      );
      setBusy(false);
    }
  };

  return (
    <MarketRecordShell
      title="New market record"
      description="Add a seller or buyer source from research. This does not create an account, listing or KYC case."
      backHref="/admin/market-records"
      backLabel="Market records"
    >
      <MarketRecordForm
        record={null}
        mode="create"
        busy={busy}
        error={error}
        serverFieldErrors={fieldErrors}
        onSubmit={(input) => void submit(input)}
        onCancel={() => router.push("/admin/market-records")}
      />
    </MarketRecordShell>
  );
}
