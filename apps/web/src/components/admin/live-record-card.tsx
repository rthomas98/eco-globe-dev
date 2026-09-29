"use client";

import { describeBackendError } from "@/lib/backend-client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { Button } from "@eco-globe/ui";
import {
  adminUpdateEscrow,
  fetchBuyerProfiles,
  fetchCompany,
  fetchEscrowById,
  fetchListingById,
  fetchOrderById,
  fetchPaymentById,
  fetchSellerProfiles,
  moderateListing,
  portalDate,
  portalMoney,
  setCompanyVerification,
  trailingNumericId,
} from "@/lib/api-portal";


/** Loads one backend record by id; failures and bad ids are reported, not hidden. */
function useRecord<T>(id: number | null, load: (id: number) => Promise<T>) {
  const [record, setRecord] = useState<T | null>(null);
  const [error, setError] = useState<{ id: number | null; message: string } | null>(null);
  const [version, setVersion] = useState(0);
  // The id each loaded record belongs to; a record for a different id is never
  // returned, even in the render before the effect for the new id runs.
  const [recordId, setRecordId] = useState<number | null>(null);
  useEffect(() => {
    if (!id) {
      setError({ id, message: "This record reference is not valid." });
      return;
    }
    let cancelled = false;
    setError(null);
    load(id)
      .then((next) => {
        if (!cancelled) {
          setRecord(next);
          setRecordId(id);
        }
      })
      .catch((err) => {
        if (!cancelled) setError({ id, message: describeBackendError(err, "This record could not be loaded.") });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, version]);
  return {
    record: recordId === id ? record : null,
    error: error && error.id === id ? error.message : null,
    reload: () => setVersion((v) => v + 1),
  };
}

function CardFallback({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
  ) : (
    <p className="mb-6 px-1 py-8 text-center text-sm text-neutral-500">Loading record…</p>
  );
}

function ActionError({ message }: { message: string | null }) {
  return message ? <p role="alert" className="basis-full text-sm text-red-700">{message}</p> : null;
}

function CardShell({
  title,
  rows,
  actions,
  notice,
}: {
  title: string;
  rows: Array<[string, string]>;
  actions?: React.ReactNode;
  notice?: string;
}) {
  return (
    <div
      className="mb-6 rounded-2xl bg-white p-6"
      style={{ border: "2px solid #16A34A" }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">
            Live record
          </p>
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="text-sm font-semibold text-neutral-900">{value}</p>
          </div>
        ))}
      </div>
      {notice && (
        <p className="mt-4 rounded-lg bg-neutral-50 px-4 py-2 text-xs text-neutral-600">
          {notice}
        </p>
      )}
    </div>
  );
}

/** Live order facts for /admin/sales/[id]. */
export function LiveOrderCard({ uiId }: { uiId: string }) {
  const { record: order, error } = useRecord(trailingNumericId(uiId), fetchOrderById);

  if (!order) return <CardFallback error={error} />;
  return (
    <CardShell
      title={`Order EG-${order.id} — ${String(order.listingTitle ?? "Marketplace order")}`}
      rows={[
        ["Status", String(order.orderStatusCode)],
        ["Buyer", String(order.buyerCompanyName)],
        ["Seller", String(order.sellerCompanyName)],
        ["Total", portalMoney(Number(order.totalAmount), String(order.currencyCode))],
        ["Escrow required", order.escrowRequired ? "Yes" : "No"],
        ["Placed", portalDate(String(order.createdAt))],
      ]}
    />
  );
}

/** Live escrow facts + admin release/unlock for /admin/accounting/escrow/[id]. */
export function LiveEscrowCard({ uiId }: { uiId: string }) {
  const id = trailingNumericId(uiId);
  const { record: escrow, error, reload } = useRecord(id, fetchEscrowById);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!escrow) return <CardFallback error={error} />;

  const act = async (patch: Parameters<typeof adminUpdateEscrow>[1]) => {
    if (!id || busy) return;
    setBusy(true);
    try {
      setActionError(null);
      await adminUpdateEscrow(id, patch);
      reload();
    } catch (err) {
      setActionError(describeBackendError(err, "The escrow change was not saved."));
    }
    setBusy(false);
  };

  return (
    <CardShell
      title={`Escrow ESC-${escrow.id} on order EG-${escrow.orderId}`}
      rows={[
        ["Status", escrow.escrowStatusCode],
        ["Amount", portalMoney(Number(escrow.amount), escrow.currencyCode)],
        ["Release rule", escrow.releaseRuleCode.replace(/_/g, " ")],
        ["Dispute locked", escrow.disputeLocked ? "Yes" : "No"],
        ["Created", portalDate(escrow.createdAt)],
        ["Updated", portalDate(escrow.updatedAt)],
      ]}
      actions={
        <>
          {escrow.disputeLocked && (
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void act({ disputeLocked: false, escrowStatusCode: "release_pending" })}
            >
              Unlock dispute
            </Button>
          )}
          {["funded", "release_pending"].includes(escrow.escrowStatusCode) &&
            !escrow.disputeLocked && (
              <Button
                variant="primary"
                size="md"
                disabled={busy}
                onClick={() => void act({ escrowStatusCode: "released" })}
              >
                {busy ? "Releasing..." : "Release funds"}
              </Button>
            )}
          <ActionError message={actionError} />
        </>
      }
    />
  );
}

/** Live payment facts for /admin/accounting/transactions/[id]. */
export function LivePaymentCard({ uiId }: { uiId: string }) {
  const { record: payment, error } = useRecord(trailingNumericId(uiId), fetchPaymentById);

  if (!payment) return <CardFallback error={error} />;
  return (
    <CardShell
      title={`Payment TX-${payment.id} on order EG-${payment.orderId}`}
      rows={[
        ["Status", payment.paymentStatusCode],
        ["Type", payment.paymentTypeCode.replace(/_/g, " ")],
        ["Amount", portalMoney(Number(payment.amount), payment.currencyCode)],
        ["Payer", payment.payerCompanyName],
        ["Escrow", payment.escrowId ? `ESC-${payment.escrowId}` : "—"],
        ["Created", portalDate(payment.createdAt)],
      ]}
    />
  );
}

/** Live listing facts + moderation for /admin/listings/[id]. */
export function LiveListingCard({ uiId }: { uiId: string }) {
  const id = trailingNumericId(uiId);
  const { record: listing, error, reload } = useRecord(id, fetchListingById);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!listing) return <CardFallback error={error} />;
  const status = String(listing.listingStatusCode);

  const moderate = async (decision: "approve" | "reject") => {
    if (!id || busy) return;
    setBusy(true);
    try {
      setActionError(null);
      await moderateListing(id, decision);
      reload();
    } catch (err) {
      setActionError(describeBackendError(err, "The moderation decision was not saved."));
    }
    setBusy(false);
  };

  return (
    <CardShell
      title={`Listing LS-${listing.id} — ${String(listing.title)}`}
      rows={[
        ["Status", status],
        ["Seller", String(listing.sellerCompanyName ?? "—")],
        [
          "Price",
          listing.pricePerUnit != null
            ? portalMoney(Number(listing.pricePerUnit), String(listing.currencyCode))
            : "—",
        ],
        ["Quantity", `${listing.quantity} ${listing.quantityUnit}`],
        ["Material", String(listing.materialTypeCode).replace(/_/g, " ")],
        ["Location", String(listing.locationCity ?? "—")],
      ]}
      actions={
        status === "pending_review" ? (
          <>
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void moderate("reject")}
            >
              Reject
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={busy}
              onClick={() => void moderate("approve")}
            >
              {busy ? "Working..." : "Approve & publish"}
            </Button>
            <ActionError message={actionError} />
          </>
        ) : undefined
      }
    />
  );
}

/** Live company facts + verify/suspend for /admin/{sellers,buyers}/[id]. */
export function LiveCompanyCard({
  uiId,
  kind,
}: {
  uiId: string;
  kind: "seller" | "buyer";
}) {
  const [loadedCompany, setCompany] = useState<Awaited<ReturnType<typeof fetchCompany>> | null>(null);
  const [profileStatus, setProfileStatus] = useState<string>("—");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const id = trailingNumericId(uiId);

  const reload = () => {
    if (!id) return;
    fetchCompany(id)
      .then((next) => {
        setCompany(next);
        setLoadError(null);
      })
      .catch((error) => setLoadError(describeBackendError(error, "The company record could not be loaded.")));
    (kind === "seller" ? fetchSellerProfiles() : fetchBuyerProfiles())
      .then((profiles) => {
        const match = profiles.find((p) => p.companyId === id);
        if (match) setProfileStatus(match.approvalStatusCode.replace(/_/g, " "));
      })
      .catch(() => {});
  };

  useEffect(reload, [id, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) return <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>;
  // Only the company for the current id is ever rendered.
  const company = loadedCompany && loadedCompany.id === id ? loadedCompany : null;
  if (!company) return null;

  // Verification approval goes through the evidence-guarded KYC review;
  // only suspension/reinstatement is changed from this card.
  const act = async (status: "suspended" | "pending_verification") => {
    if (!id || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await setCompanyVerification(id, status);
      reload();
    } catch (error) {
      setActionError(describeBackendError(error, "The change was not saved."));
    }
    setBusy(false);
  };

  return (
    <CardShell
      title={company.legalName}
      rows={[
        ["Company ID", `C-${company.id}`],
        ["Type", company.companyTypeCode],
        ["Verification", company.verificationStatusCode.replace(/_/g, " ")],
        [`${kind === "seller" ? "Seller" : "Buyer"} approval`, profileStatus],
        ["Joined", portalDate(company.createdAt)],
      ]}
      actions={
        <>
          {company.verificationStatusCode !== "suspended" ? (
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void act("suspended")}
            >
              Suspend
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => void act("pending_verification")}
            >
              Reinstate
            </Button>
          )}
          {company.verificationStatusCode !== "verified" && (
            <Link href="/admin/kyc" className="text-sm font-semibold text-neutral-900 underline">
              Review verification evidence
            </Link>
          )}
          {actionError && <p role="alert" className="basis-full text-sm text-red-700">{actionError}</p>}
        </>
      }
      notice="Suspension changes are saved to the live marketplace record before they show."
    />
  );
}
